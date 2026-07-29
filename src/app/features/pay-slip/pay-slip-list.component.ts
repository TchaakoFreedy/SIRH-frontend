// src/app/features/pay-slip/pay-slip-list.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PaySlipService } from '../../core/services/pay-slip.service';
import { AuthService } from '../../services/auth.service';
import { PaySlip } from '../../core/models/pay-slip.model';
import { PermissionDirective } from '../../shared/permission.directive';

@Component({
  selector: 'app-pay-slip-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CurrencyPipe,
    PermissionDirective
  ],
  templateUrl: './pay-slip-list.component.html',
  styleUrls: ['./pay-slip-list.component.css']
})
export class PaySlipListComponent implements OnInit {

  paySlips: PaySlip[] = [];
  filtered: PaySlip[] = [];

  loading = false;
  error = '';
  searchTerm = '';

  canViewAll = false;
  canEdit = false;
  canDelete = false;
  canDownload = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math;

  constructor(
    private paySlipService: PaySlipService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const permissions = user?.permissions ?? [];

    this.canViewAll = permissions.includes('PAYSLIP_VIEW_ALL');
    this.canEdit = permissions.includes('PAYSLIP_UPDATE');
    this.canDelete = permissions.includes('PAYSLIP_DELETE');
    this.canDownload = permissions.includes('PAYSLIP_DOWNLOAD');

    if (!this.canViewAll) {
      this.error = "⛔ Vous n'avez pas les droits nécessaires.";
      this.cdr.detectChanges();
      return;
    }

    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.paySlipService
      .getAll()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          let slips: PaySlip[] = [];
          if (Array.isArray(response)) {
            slips = response;
          } else if (response?.content) {
            slips = response.content;
          } else if (response?.data) {
            slips = response.data;
          }

          this.paySlips = slips.sort((a, b) =>
            (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
            (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          );

          this.filtered = [...this.paySlips];
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Erreur de chargement.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // === Statistiques ===
  get totalNetSalary(): number {
    return this.paySlips.reduce((sum, s) => sum + (s.netSalary || 0), 0);
  }

  get latestPeriod(): string {
    if (this.paySlips.length === 0) return '';
    return this.paySlips[0]?.period || '';
  }

  get totalPages(): number {
    return this.paySlips.reduce((sum, s) => sum + (s.imageIds?.length || 0), 0);
  }

  get successCount(): number {
    return this.paySlips.filter(s => s.status === 'SUCCESS' || s.status === 'PARTIAL_SUCCESS').length;
  }

  // === Filtre ===
  filter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filtered = [...this.paySlips];
    } else {
      this.filtered = this.paySlips.filter(slip =>
        (slip.employeeFullName ?? '').toLowerCase().includes(term) ||
        (slip.employeeMatricule ?? '').toLowerCase().includes(term) ||
        (slip.period ?? '').toLowerCase().includes(term) ||
        (slip.status ?? '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filter();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filter();
  }

  // === Pagination ===
  get totalPagesCount(): number {
    return Math.ceil(this.filtered.length / this.itemsPerPage) || 1;
  }

  get paginatedSlips(): PaySlip[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filtered.slice(start, end);
  }

  get visiblePages(): number[] {
    const total = this.totalPagesCount;
    const current = this.currentPage;
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPagesCount) return;
    this.currentPage = page;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPagesCount) this.currentPage++;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // === Actions ===
  viewDetail(id: string): void {
    this.router.navigate(['/app/paie/pay-slip-detail', id]);
  }

  edit(id: string): void {
    this.router.navigate(['/app/paie/edit', id]);
  }

  delete(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bulletin ?')) return;
    this.paySlipService.delete(id).subscribe({
      next: () => {
        this.paySlips = this.paySlips.filter(s => s.id !== id);
        this.filtered = this.filtered.filter(s => s.id !== id);
        this.cdr.detectChanges();
      },
      error: err => {
        console.error(err);
        alert(err.message);
      }
    });
  }

  downloadPdf(id: string): void {
    this.paySlipService.downloadPdf(id);
  }

  downloadZip(id: string): void {
    this.paySlipService.downloadZip(id);
  }

  viewPages(id: string): void {
    // Naviguer vers la page de détail ou un modal
    this.router.navigate(['/app/paie/pay-slip-detail', id]);
  }

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
}