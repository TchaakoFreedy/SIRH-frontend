// src/app/features/organisation/departements/departements.component.ts

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DepartementService } from '../../../core/services/departement.service';
import { EntrepriseService } from '../../../core/services/entreprise.service';
import { PermissionService } from '../../../core/services/permission.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-departements',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './departements.html',
  styleUrls: ['./departements.css']
})
export class DepartementsComponent implements OnInit {
  // === SIGNALS ===
  departements = signal<any[]>([]);
  filteredDepartements = signal<any[]>([]);
  paginatedDepartements = signal<any[]>([]);
  entreprises = signal<any[]>([]);
  isLoading = signal(false);
  showSuccessToast = signal(false);
  successMessage = signal('');
  isErrorToast = signal(false);

  // === PERMISSIONS ===
  canViewAllDepartements = signal(true);
  canViewDepartement = signal(true);
  canCreateDepartement = signal(true);
  canUpdateDepartement = signal(true);
  canDeleteDepartement = signal(true);
  canSuspendDepartement = signal(true);
  canReactivateDepartement = signal(true);

  // === PAGINATION ===
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // === FILTRES ===
  searchTerm = '';
  selectedEntreprise = '';

  // === STATS ===
  stats = computed(() => {
    const deps = this.departements();
    return {
      total: deps.length,
      actifs: deps.filter(d => d.statut === 'ACTIF' || !d.statut).length,
      suspendus: deps.filter(d => d.statut === 'SUSPENDU').length
    };
  });

  // === MODALE ===
  showModal = signal(false);
  editMode = signal(false);
  form!: FormGroup;
  statutOptions = ['ACTIF', 'SUSPENDU'];

  // === MATH pour pagination ===
  Math = Math;

  private departementService = inject(DepartementService);
  private entrepriseService = inject(EntrepriseService);
  private fb = inject(FormBuilder);
  private permissionService = inject(PermissionService);
  private authService = inject(AuthService);

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.loadData();
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      entrepriseId: ['', Validators.required],
      statut: ['ACTIF']
    });
  }

  // ==========================================
  // 🔐 PERMISSIONS
  // ==========================================

  private loadPermissions(): void {
    console.log('🔐 Chargement des permissions Départements...');
    
    const user = this.authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', user);
    console.log('🔒 Rôle:', user?.role);
    
    // ✅ Si l'utilisateur est RH, SUPER_ADMIN ou TOP_MANAGER, activer toutes les permissions
    const isAdmin = user?.role === 'RH' || 
                    user?.role === 'SUPER_ADMIN' || 
                    user?.role === 'TOP_MANAGER' ||
                    user?.roles?.includes('RH') ||
                    user?.roles?.includes('SUPER_ADMIN') ||
                    user?.roles?.includes('TOP_MANAGER') ||
                    user?.permissions?.includes('*');

    if (isAdmin) {
      console.log('✅ Admin détecté - Activation de toutes les permissions Départements');
      this.canViewAllDepartements.set(true);
      this.canViewDepartement.set(true);
      this.canCreateDepartement.set(true);
      this.canUpdateDepartement.set(true);
      this.canDeleteDepartement.set(true);
      this.canSuspendDepartement.set(true);
      this.canReactivateDepartement.set(true);
      return;
    }

    // Pour les autres rôles, charger les permissions normalement
    this.canViewAllDepartements.set(this.permissionService.hasPermissionSync('DEPARTMENT_VIEW_ALL'));
    this.canViewDepartement.set(this.permissionService.hasPermissionSync('DEPARTMENT_VIEW'));
    this.canCreateDepartement.set(this.permissionService.hasPermissionSync('DEPARTMENT_CREATE'));
    this.canUpdateDepartement.set(this.permissionService.hasPermissionSync('DEPARTMENT_UPDATE'));
    this.canDeleteDepartement.set(this.permissionService.hasPermissionSync('DEPARTMENT_DELETE'));
    this.canSuspendDepartement.set(this.permissionService.hasPermissionSync('DEPARTMENT_SUSPEND'));
    this.canReactivateDepartement.set(this.permissionService.hasPermissionSync('DEPARTMENT_REACTIVATE'));

    console.log('🔐 Permissions Départements chargées:', {
      canViewAllDepartements: this.canViewAllDepartements(),
      canCreateDepartement: this.canCreateDepartement(),
      canUpdateDepartement: this.canUpdateDepartement(),
      canSuspendDepartement: this.canSuspendDepartement(),
      canReactivateDepartement: this.canReactivateDepartement(),
    });
  }

  // ==========================================
  // 📥 CHARGEMENT DES DONNÉES
  // ==========================================

  loadData(): void {
    if (!this.canViewAllDepartements()) {
      console.warn('⚠️ Permission DEPARTMENT_VIEW_ALL manquante');
      this.showToast('Vous n\'avez pas la permission de voir les départements', true);
      return;
    }
    
    this.isLoading.set(true);
    
    // Charger les entreprises
    this.entrepriseService.getAll().subscribe({
      next: (data) => {
        this.entreprises.set(data || []);
      },
      error: (err) => {
        console.error('Erreur chargement entreprises:', err);
        this.entreprises.set([]);
      }
    });

    // Charger les départements
    this.departementService.getAll().subscribe({
      next: (data) => {
        this.departements.set(data || []);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement départements:', err);
        this.departements.set([]);
        this.filteredDepartements.set([]);
        this.paginatedDepartements.set([]);
        this.isLoading.set(false);
        this.showToast('Erreur lors du chargement des départements', true);
      }
    });
  }

  // ==========================================
  // 🔍 RECHERCHE & FILTRES
  // ==========================================

  applyFilters(): void {
    const all = this.departements();
    const search = this.searchTerm.toLowerCase().trim();
    const entrepriseFilter = this.selectedEntreprise;

    const filtered = all.filter(dep => {
      let match = true;

      if (search) {
        const name = (dep.name || '').toLowerCase();
        if (!name.includes(search)) {
          match = false;
        }
      }

      if (entrepriseFilter && dep.entrepriseId !== entrepriseFilter) {
        match = false;
      }

      return match;
    });

    this.filteredDepartements.set(filtered);
    this.currentPage = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedEntreprise = '';
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearFilter(): void {
    this.selectedEntreprise = '';
    this.applyFilters();
  }

  // ==========================================
  // 📄 PAGINATION
  // ==========================================

  updatePagination(): void {
    const filtered = this.filteredDepartements();
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    this.updatePaginatedData();
  }

  updatePaginatedData(): void {
    const filtered = this.filteredDepartements();
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedDepartements.set(filtered.slice(start, end));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedData();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    const maxVisible = 5;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, current - 2);
      let end = Math.min(total, current + 2);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push(-1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < total) {
        if (end < total - 1) pages.push(-1);
        pages.push(total);
      }
    }
    
    return pages;
  }

  // ==========================================
  // 🪟 MODALE
  // ==========================================

  openModal(): void {
    if (!this.canCreateDepartement()) {
      this.showToast('❌ Vous n\'avez pas la permission de créer un département', true);
      return;
    }
    
    this.editMode.set(false);
    this.form.reset({ statut: 'ACTIF' });
    this.showModal.set(true);
  }

  edit(dep: any): void {
    if (!this.canUpdateDepartement()) {
      this.showToast('❌ Vous n\'avez pas la permission de modifier un département', true);
      return;
    }
    
    this.editMode.set(true);
    this.form.patchValue({
      id: dep.id,
      name: dep.name,
      entrepriseId: dep.entrepriseId,
      statut: dep.statut || 'ACTIF'
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.reset({ statut: 'ACTIF' });
  }

  // ==========================================
  // 📤 SOUMISSION
  // ==========================================

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.editMode() && !this.canUpdateDepartement()) {
      this.showToast('❌ Vous n\'avez pas la permission de modifier un département', true);
      return;
    }

    if (!this.editMode() && !this.canCreateDepartement()) {
      this.showToast('❌ Vous n\'avez pas la permission de créer un département', true);
      return;
    }

    this.isLoading.set(true);
    const data = this.form.value;

    if (this.editMode()) {
      // Update
      this.departementService.update(data.id, data).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.closeModal();
          this.loadData();
          this.showToast('✅ Département mis à jour avec succès !', false);
        },
        error: (err) => {
          console.error('Erreur mise à jour:', err);
          this.isLoading.set(false);
          this.showToast('❌ Erreur lors de la mise à jour', true);
        }
      });
    } else {
      // Create
      this.departementService.create(data).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.closeModal();
          this.loadData();
          this.showToast('✅ Département créé avec succès !', false);
        },
        error: (err) => {
          console.error('Erreur création:', err);
          this.isLoading.set(false);
          this.showToast('❌ Erreur lors de la création', true);
        }
      });
    }
  }

  // ==========================================
  // ⚡ ACTIONS
  // ==========================================

  suspendre(id: string): void {
    if (!this.canSuspendDepartement()) {
      this.showToast('❌ Vous n\'avez pas la permission de suspendre un département', true);
      return;
    }
    
    if (!confirm('Voulez-vous vraiment suspendre ce département ?')) return;
    this.isLoading.set(true);
    this.departementService.suspendre(id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.loadData();
        this.showToast('⛔ Département suspendu avec succès', false);
      },
      error: (err) => {
        console.error('Erreur suspension:', err);
        this.isLoading.set(false);
        this.showToast('❌ Erreur lors de la suspension', true);
      }
    });
  }

  reactiver(id: string): void {
    if (!this.canReactivateDepartement()) {
      this.showToast('❌ Vous n\'avez pas la permission de réactiver un département', true);
      return;
    }
    
    if (!confirm('Voulez-vous vraiment réactiver ce département ?')) return;
    this.isLoading.set(true);
    this.departementService.reactiver(id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.loadData();
        this.showToast('✅ Département réactivé avec succès', false);
      },
      error: (err) => {
        console.error('Erreur réactivation:', err);
        this.isLoading.set(false);
        this.showToast('❌ Erreur lors de la réactivation', true);
      }
    });
  }

  // ==========================================
  // 🛠 HELPERS
  // ==========================================

  getEntrepriseName(entrepriseId: string): string {
    if (!entrepriseId) return 'Non assigné';
    const entreprise = this.entreprises().find(e => e.id === entrepriseId);
    return entreprise ? entreprise.name : 'Entreprise inconnue';
  }

  isActive(statut: string): boolean {
    return statut === 'ACTIF' || !statut;
  }

  isSuspended(statut: string): boolean {
    return statut === 'SUSPENDU';
  }

  // ==========================================
  // 🔔 TOAST
  // ==========================================

  showToast(message: string, isError: boolean): void {
    this.successMessage.set(message);
    this.isErrorToast.set(isError);
    this.showSuccessToast.set(true);
    setTimeout(() => {
      this.showSuccessToast.set(false);
    }, 4000);
  }
}