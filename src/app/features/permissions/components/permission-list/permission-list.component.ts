import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-permission-list',
  templateUrl: './permission-list.component.html',
  styleUrls: ['./permission-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PermissionListComponent implements OnInit, OnDestroy {
  permissions: Permission[] = [];
  filteredPermissions: Permission[] = []; // Page courante
  allFiltered: Permission[] = [];         // Tous les résultats filtrés
  
  isLoading = false;
  searchTerm = '';
  selectedCategory = 'all';
  categories: string[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math; // ⬅️ Ajout de Math pour l'utiliser dans le template

  private destroy$ = new Subject<void>();

  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPermissions(): void {
    this.isLoading = true;
    this.permissionService.getAllPermissions()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isLoading = false; })
      )
      .subscribe({
        next: (data) => {
          this.permissions = data || [];
          this.extractCategories();
          this.applyFilters();
        },
        error: () => this.toastr.error('Erreur de chargement')
      });
  }

  extractCategories(): void {
    this.categories = [...new Set(this.permissions.map(p => p.category).filter(Boolean))].sort();
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.allFiltered = this.permissions.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(term) || (p.description?.toLowerCase().includes(term) || false);
      const matchesCategory = this.selectedCategory === 'all' || p.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });

    this.currentPage = 1;
    this.updatePage();
  }

  updatePage(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.filteredPermissions = this.allFiltered.slice(startIndex, startIndex + this.itemsPerPage);
    this.cdr.detectChanges();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePage();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.allFiltered.length / this.itemsPerPage);
  }

  // ================================
  // NOUVELLES MÉTHODES AJOUTÉES
  // ================================

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearCategoryFilter(): void {
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePage();
  }

  getVisiblePages(): number[] {
    const current = this.currentPage;
    const total = this.totalPages;
    const pages: number[] = [];
    const delta = 1;
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  // ================================
  // ACTIONS SUR PERMISSIONS
  // ================================

  viewPermission(id: string): void {
    this.router.navigate(['/app/admin/permissions', id]);
  }

  editPermission(id: string): void {
    this.router.navigate(['/app/admin/permissions/edit', id]);
  }

  createPermission(): void {
    this.router.navigate(['/app/admin/permissions/create']);
  }

  deletePermission(id: string, name: string): void {
    if (confirm(`Supprimer "${name}" ?`)) {
      this.permissionService.deletePermission(id).subscribe(() => {
        this.toastr.success('Supprimé');
        this.loadPermissions();
      });
    }
  }
}