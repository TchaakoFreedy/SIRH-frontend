// src/app/features/pay-slip/my-pay-slips.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';
import { PaySlipService } from '../../core/services/pay-slip.service';
import { AuthService } from '../../services/auth.service';
import { PaySlip } from '../../core/models/pay-slip.model';

@Component({
  selector: 'app-my-pay-slips',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, FormsModule],
  templateUrl: './my-pay-slips.component.html',
  styleUrls: ['./my-pay-slips.component.css']
})
export class MyPaySlipsComponent implements OnInit, OnDestroy {
  paySlips: PaySlip[] = [];
  filteredSlips: PaySlip[] = [];
  loading = false;
  error = '';
  canDownload = false;

  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private paySlipService: PaySlipService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const permissions = user?.permissions ?? [];
    this.canDownload = permissions.includes('PAYSLIP_DOWNLOAD');
    this.loadMySlips();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMySlips(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.paySlipService.getMySlips()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          let slips: PaySlip[] = [];
          if (Array.isArray(data)) {
            slips = data;
          } else if (data && typeof data === 'object') {
            slips = (data as any).content || (data as any).data || [];
          }
          this.paySlips = slips.sort((a, b) =>
            (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
            (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          );
          this.filteredSlips = [...this.paySlips];
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = 'Erreur de chargement : ' + (err.message || 'Erreur inconnue');
          this.cdr.detectChanges();
        }
      });
  }

  // ======== FILTRE ========
  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredSlips = [...this.paySlips];
    } else {
      this.filteredSlips = this.paySlips.filter(slip =>
        (slip.period || '').toLowerCase().includes(term) ||
        (slip.status || '').toLowerCase().includes(term) ||
        (slip.employeeFullName || '').toLowerCase().includes(term) ||
        (slip.employeeMatricule || '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  // ======== PAGINATION ========
  get totalPages(): number {
    return Math.ceil(this.filteredSlips.length / this.itemsPerPage) || 1;
  }

  get paginatedSlips(): PaySlip[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredSlips.slice(start, end);
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // ======== ACTIONS ========
  viewDetail(id: string): void {
    this.router.navigate(['/app/paie/pay-slip-detail', id]);
  }

  downloadPdf(id: string): void {
    this.paySlipService.downloadPdf(id);
  }

  downloadZip(id: string): void {
    this.paySlipService.downloadZip(id);
  }

  // ======== UTILITAIRES ========
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

  hasErrors(slip: PaySlip): boolean {
    return !!(slip.importErrors && slip.importErrors.length > 0);
  }

  trackById(index: number, item: PaySlip): string {
    return item.id;
  }

  // ======== STATISTIQUES ========
  get totalNetSalary(): number {
    return this.paySlips.reduce((sum, s) => sum + (s.netSalary || 0), 0);
  }

  get latestPeriod(): string {
    return this.paySlips[0]?.period || '';
  }

  get totalPagesCount(): number {
    return this.paySlips.reduce((sum, s) => sum + (s.imageUrls?.length || 0), 0);
  }

  // Helper pour obtenir le nombre de pages d'un bulletin
  getPageCount(slip: PaySlip): number {
    return slip.imageUrls?.length || 0;
  }
}