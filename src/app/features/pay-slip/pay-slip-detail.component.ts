// src/app/features/pay-slip/pay-slip-detail.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { PaySlipService } from '../../core/services/pay-slip.service';
import { AuthService } from '../../services/auth.service';
import { PaySlip } from '../../core/models/pay-slip.model';

@Component({
  selector: 'app-pay-slip-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe],
  templateUrl: './pay-slip-detail.component.html',
  styleUrls: ['./pay-slip-detail.component.css']
})
export class PaySlipDetailComponent implements OnInit, OnDestroy {
  paySlip: PaySlip | null = null;
  loading = false;
  error = '';
  canDownload = false;
  pageUrls: string[] = [];
  loadingPages = false;

  // Image de remplacement (placez un fichier dans assets/ ou utilisez une base64)
  private readonly PLACEHOLDER_IMAGE = 'assets/placeholder-image.png';

  private destroy$ = new Subject<void>();

  constructor(
    public paySlipService: PaySlipService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const permissions = this.authService.getCurrentUser()?.permissions || [];
    this.canDownload = permissions.includes('PAYSLIP_DOWNLOAD');

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.loadPaySlip(id);
        } else {
          this.error = '⚠️ ID du bulletin manquant.';
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPaySlip(id: string): void {
    if (!id || id.trim() === '') {
      this.error = '⚠️ ID invalide.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.paySlipService.getById(id.trim())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.paySlip = data;
          this.loadPageUrls();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.message || 'Erreur lors du chargement du bulletin';
          this.cdr.detectChanges();
        }
      });
  }

  loadPageUrls(): void {
    if (!this.paySlip || !this.paySlip.imageIds || this.paySlip.imageIds.length === 0) {
      this.pageUrls = [];
      return;
    }
    this.loadingPages = true;
    this.pageUrls = this.paySlip.imageIds.map(id => this.paySlipService.getImageUrl(id));
    this.loadingPages = false;
    this.cdr.detectChanges();
  }

  // ========== GESTION DES ERREURS D'IMAGE ==========
  /**
   * Remplace l'URL défaillante par l'image placeholder
   */
  onImageError(index: number): void {
    if (this.pageUrls[index] && this.pageUrls[index] !== this.PLACEHOLDER_IMAGE) {
      this.pageUrls[index] = this.PLACEHOLDER_IMAGE;
      this.cdr.detectChanges();
    }
  }

  // ========== TÉLÉCHARGEMENTS ==========
  downloadPdf(): void {
    if (this.paySlip) {
      this.paySlipService.downloadPdf(this.paySlip.id);
    }
  }

  downloadZip(): void {
    if (this.paySlip && this.paySlip.imageIds && this.paySlip.imageIds.length > 0) {
      this.paySlipService.downloadZip(this.paySlip.id);
    }
  }

  downloadPage(pageIndex: number): void {
    if (this.paySlip) {
      this.paySlipService.downloadPage(this.paySlip.id, pageIndex + 1);
    }
  }

  viewPage(pageIndex: number): void {
    if (this.paySlip) {
      const url = this.paySlipService.getImageUrl(this.paySlip.imageIds[pageIndex]);
      window.open(url, '_blank');
    }
  }

  // ========== UTILITAIRES ==========
  getStatusBadgeClass(status?: string): string {
    if (!status) return 'badge-secondary';
    switch (status) {
      case 'SUCCESS': return 'badge-success';
      case 'PARTIAL_SUCCESS': return 'badge-warning';
      case 'FAILED': return 'badge-danger';
      case 'EMPLOYEE_NOT_FOUND': return 'badge-danger';
      case 'OCR_ERROR': return 'badge-warning';
      case 'INVALID_DOCUMENT': return 'badge-danger';
      case 'PROCESSING': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status?: string): string {
    if (!status) return 'Inconnu';
    const map: Record<string, string> = {
      'PROCESSING': 'En cours',
      'SUCCESS': 'Succès',
      'PARTIAL_SUCCESS': 'Partiel',
      'FAILED': 'Échec',
      'EMPLOYEE_NOT_FOUND': 'Employé non trouvé',
      'OCR_ERROR': 'Erreur OCR',
      'INVALID_DOCUMENT': 'Document invalide'
    };
    return map[status] || status;
  }

  hasErrors(): boolean {
    return !!(this.paySlip?.importErrors && this.paySlip.importErrors.length > 0);
  }

  trackByIndex(index: number): number {
    return index;
  }
}