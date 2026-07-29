// src/app/features/organisation/entreprises/entreprises.component.ts

import { Component, OnInit, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

import { EntrepriseService } from '../../../core/services/entreprise.service';
import { Entreprise } from '../../../core/models';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { EntrepriseFormDialogComponent } from './entreprise-form-dialog.component';
import { EntrepriseDetailsDialogComponent } from './entreprise-details-dialog.component';
import { PermissionService } from '../../../core/services/permission.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-entreprises',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    MatButtonModule, 
    MatCardModule,
    MatDialogModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule,
    MatTooltipModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './entreprises.html',
  styleUrls: ['./entreprises.css']
})
export class EntreprisesComponent implements OnInit, OnDestroy {

  private dialog = inject(MatDialog);
  private service = inject(EntrepriseService);
  private fb = inject(FormBuilder);
  private permissionService = inject(PermissionService);
  private authService = inject(AuthService);

  // ============ SIGNALS ============
  entreprises = signal<Entreprise[]>([]);
  isLoading = signal(false);
  showSuccessToast = signal(false);
  successMessage = signal('');

  // ============ RECHERCHE & FILTRES (SIGNALS) ============
  searchTerm = signal('');
  selectedStatut = signal('');

  // ============ PERMISSIONS ============
  canViewAllCompanies = signal(true);
  canCreateCompany = signal(true);
  canUpdateCompany = signal(true);
  canDeleteCompany = signal(true);
  canSuspendCompany = signal(true);
  canReactivateCompany = signal(true);
  canViewCompany = signal(true);

  // ============ PAGINATION ============
  currentPage = signal(1);
  itemsPerPage = 10;
  Math = Math;

  // ============ MODALE ============
  showModal = signal(false);
  isEditMode = signal(false);
  form!: FormGroup;

  private effectRef: any;

  // ============ COMPUTED ============
  
  stats = computed(() => {
    const total = this.entreprises().length;
    const actifs = this.entreprises().filter(e => this.isActive(e.statut)).length;
    const suspendus = this.entreprises().filter(e => this.isSuspended(e.statut)).length;
    return { total, actifs, suspendus };
  });

  filteredEntreprises = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const statut = this.selectedStatut();

    return this.entreprises().filter(ent => {
      const matchSearch = !search ||
        ent.name?.toLowerCase().includes(search) ||
        ent.siege?.toLowerCase().includes(search) ||
        ent.adresse?.toLowerCase().includes(search) ||
        ent.telephone?.toLowerCase().includes(search) ||
        ent.email?.toLowerCase().includes(search);

      const matchStatut = !statut || ent.statut === statut;
      return matchSearch && matchStatut;
    });
  });

  totalPages = computed(() => {
    const total = this.filteredEntreprises().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedEntreprises = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredEntreprises().slice(startIndex, endIndex);
  });

  // ============ CONSTRUCTOR ============
  constructor() {
    // Effet pour réinitialiser la page à 1 dès qu'un filtre change
    this.effectRef = effect(() => {
      this.searchTerm();
      this.selectedStatut();
      this.currentPage.set(1);
    });
  }

  // ============ LIFECYCLE ============
  ngOnInit(): void {
    this.loadPermissions();
    this.initForm();
    this.load();
  }

  ngOnDestroy(): void {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }

  // ==========================================
  // 🔐 PERMISSIONS
  // ==========================================

  private loadPermissions(): void {
    console.log('🔐 Chargement des permissions Entreprises...');
    
    const user = this.authService.getCurrentUser();
    const isAdmin = user?.role === 'RH' || 
                    user?.role === 'SUPER_ADMIN' || 
                    user?.role === 'TOP_MANAGER' ||
                    user?.roles?.includes('RH') ||
                    user?.roles?.includes('SUPER_ADMIN') ||
                    user?.roles?.includes('TOP_MANAGER') ||
                    user?.permissions?.includes('*');

    if (isAdmin) {
      console.log('✅ Admin détecté - Activation de toutes les permissions Entreprises');
      this.canViewAllCompanies.set(true);
      this.canViewCompany.set(true);
      this.canCreateCompany.set(true);
      this.canUpdateCompany.set(true);
      this.canDeleteCompany.set(true);
      this.canSuspendCompany.set(true);
      this.canReactivateCompany.set(true);
      return;
    }

    this.canViewAllCompanies.set(this.permissionService.hasPermissionSync('COMPANY_VIEW_ALL'));
    this.canViewCompany.set(this.permissionService.hasPermissionSync('COMPANY_VIEW'));
    this.canCreateCompany.set(this.permissionService.hasPermissionSync('COMPANY_CREATE'));
    this.canUpdateCompany.set(this.permissionService.hasPermissionSync('COMPANY_UPDATE'));
    this.canDeleteCompany.set(this.permissionService.hasPermissionSync('COMPANY_DELETE'));
    this.canSuspendCompany.set(this.permissionService.hasPermissionSync('COMPANY_SUSPEND'));
    this.canReactivateCompany.set(this.permissionService.hasPermissionSync('COMPANY_REACTIVATE'));
  }

  // ============ FORMULAIRE MODALE ============
  initForm(): void {
    this.form = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.minLength(2)]],
      siege: [''],
      adresse: [''],
      telephone: [''],
      email: ['', Validators.email],
      statut: ['ACTIF']
    });
  }

  // ============ MÉTHODES DE FILTRAGE ============
  
  // Le filtrage est automatique grâce aux signaux.
  // On garde ces méthodes pour les boutons clear/reset.
  applyFilters(): void {
    // L'effet s'occupe de remettre la page à 1.
    // On peut laisser vide ou ajouter d'autres traitements.
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  clearFilter(): void {
    this.selectedStatut.set('');
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatut.set('');
  }

  // ============ GESTION DE LA MODALE PERSONNALISÉE ============
  
  closeModal(): void {
    this.showModal.set(false);
    this.form.reset({ statut: 'ACTIF' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.showToast('⚠️ Veuillez corriger les erreurs du formulaire', true);
      return;
    }

    const data = this.form.value;
    this.isLoading.set(true);

    if (this.isEditMode() && data.id) {
      // Mise à jour
      this.service.update(data.id, data).subscribe({
        next: () => {
          this.load();
          this.showToast('✏️ Entreprise mise à jour avec succès');
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.isLoading.set(false);
          this.showToast('❌ Erreur lors de la mise à jour', true);
        }
      });
    } else {
      // Création
      this.service.create(data).subscribe({
        next: () => {
          this.load();
          this.showToast('✨ Entreprise créée avec succès');
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.isLoading.set(false);
          this.showToast('❌ Erreur lors de la création', true);
        }
      });
    }
  }

  // ============ CRUD OPERATIONS ============
  
  load(): void {
    if (!this.canViewAllCompanies()) {
      console.warn('⚠️ Permission COMPANY_VIEW_ALL manquante');
      return;
    }
    this.isLoading.set(true);
    this.service.getAll().subscribe({
      next: (data: Entreprise[]) => {
        this.entreprises.set(data);
        this.isLoading.set(false);
      },
      error: (error: Error) => {
        console.error('Erreur:', error);
        this.isLoading.set(false);
        this.showToast('❌ Erreur lors du chargement des entreprises', true);
      }
    });
  }

  openCreateModal(): void {
    if (!this.canCreateCompany()) {
      this.showToast('❌ Vous n\'avez pas la permission de créer une entreprise', true);
      return;
    }
    
    this.isEditMode.set(false);
    this.form.reset({ statut: 'ACTIF' });
    this.showModal.set(true);
  }

  openEditModal(ent: Entreprise): void {
    if (!this.canUpdateCompany()) {
      this.showToast('❌ Vous n\'avez pas la permission de modifier une entreprise', true);
      return;
    }
    
    this.isEditMode.set(true);
    this.form.patchValue({
      id: ent.id,
      name: ent.name,
      siege: ent.siege,
      adresse: ent.adresse,
      telephone: ent.telephone,
      email: ent.email,
      statut: ent.statut || 'ACTIF'
    });
    this.showModal.set(true);
  }

  viewDetails(ent: Entreprise): void {
    if (!this.canViewCompany() && !this.canViewAllCompanies()) {
      this.showToast('❌ Vous n\'avez pas la permission de voir les détails', true);
      return;
    }
    
    this.dialog.open(EntrepriseDetailsDialogComponent, {
      width: '600px', 
      maxWidth: '95vw', 
      data: { entreprise: ent }
    });
  }

  confirmDelete(ent: Entreprise): void {
    if (!this.canDeleteCompany()) {
      this.showToast('❌ Vous n\'avez pas la permission de supprimer une entreprise', true);
      return;
    }
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Suppression définitive',
        message: `Voulez-vous vraiment supprimer l'entreprise "${ent.name}" ? Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        confirmColor: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && ent.id) {
        this.isLoading.set(true);
        this.service.delete(ent.id).subscribe({
          next: () => {
            this.load();
            this.showToast('🗑️ Entreprise supprimée avec succès');
          },
          error: () => {
            this.isLoading.set(false);
            this.showToast('❌ Erreur lors de la suppression', true);
          }
        });
      }
    });
  }

  suspendre(ent: Entreprise): void {
    if (!this.canSuspendCompany()) {
      this.showToast('❌ Vous n\'avez pas la permission de suspendre une entreprise', true);
      return;
    }
    
    if (!ent.id) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Suspension',
        message: `Êtes-vous sûr de vouloir suspendre l'entreprise "${ent.name}" ? Ses utilisateurs n'auront plus accès au système.`,
        confirmLabel: 'Suspendre',
        cancelLabel: 'Annuler',
        confirmColor: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && ent.id) {
        this.isLoading.set(true);
        this.service.suspendre(ent.id).subscribe({
          next: () => {
            this.load();
            this.showToast('⛔ Entreprise suspendue avec succès');
          },
          error: () => {
            this.isLoading.set(false);
            this.showToast('❌ Erreur lors de la suspension', true);
          }
        });
      }
    });
  }

  reactiver(ent: Entreprise): void {
    if (!this.canReactivateCompany()) {
      this.showToast('❌ Vous n\'avez pas la permission de réactiver une entreprise', true);
      return;
    }
    
    if (!ent.id) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Réactivation',
        message: `Voulez-vous réactiver l'entreprise "${ent.name}" et rétablir ses accès ?`,
        confirmLabel: 'Réactiver',
        cancelLabel: 'Annuler',
        confirmColor: 'primary'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && ent.id) {
        this.isLoading.set(true);
        this.service.reactiver(ent.id).subscribe({
          next: () => {
            this.load();
            this.showToast('✅ Entreprise réactivée avec succès');
          },
          error: (err) => {
            console.error(err);
            this.isLoading.set(false);
            this.showToast('❌ Erreur lors de la réactivation', true);
          }
        });
      }
    });
  }

  // ============ PAGINATION ============
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];
    const delta = 1;

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      pages.push(i);
    }

    return pages;
  }

  // ============ UTILITIES ============
  
  isSuspended(statut?: string): boolean {
    return statut?.trim().toUpperCase() === 'SUSPENDU';
  }

  isActive(statut?: string): boolean {
    return statut?.trim().toUpperCase() === 'ACTIF';
  }

  showToast(message: string, isError = false): void {
    this.successMessage.set(message);
    this.showSuccessToast.set(true);
    setTimeout(() => this.showSuccessToast.set(false), 3500);
  }
}