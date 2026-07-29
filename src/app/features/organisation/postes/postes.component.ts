// src/app/features/rh/postes/postes.component.ts

import { Component, OnInit, OnDestroy, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Poste } from '../../../core/models/poste.model';
import { PostesService } from '../../../core/services/postes.service';
import { DepartementService } from '../../../core/services/departement.service';
import { PermissionService } from '../../../core/services/permission.service';
import { AuthService } from '../../../services/auth.service';
import { Departement } from '../../../core/models/departement.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-postes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './postes.component.html',
  styleUrls: ['./postes.component.css']
})
export class PostesComponent implements OnInit, OnDestroy {
  postes = signal<Poste[]>([]);
  filteredPostes = signal<Poste[]>([]);

  // Départements
  departements = signal<Departement[]>([]);
  loadingDepartements = signal(false);

  searchText = '';
  showModal = false;
  isEditMode = false;
  selectedId: string | null = null;
  posteForm: Poste = this.initPoste();
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  submitted = false;

  // Permissions
  canViewAllPositions = signal(true);
  canViewPosition = signal(true);
  canCreatePosition = signal(true);
  canUpdatePosition = signal(true);
  canDeletePosition = signal(true);
  canTogglePosition = signal(true);

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 10;
  Math = Math;

  totalPages = computed(() => {
    const total = this.filteredPostes().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedPostes = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredPostes().slice(startIndex, endIndex);
  });

  private subscriptions: Subscription[] = [];
  private permissionService = inject(PermissionService);
  private authService = inject(AuthService);

  constructor(
    private postesService: PostesService,
    private departementService: DepartementService
  ) {
    effect(() => {
      this.filteredPostes();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    // Charger les départements avant les postes pour avoir les noms
    this.loadDepartementsAndPostes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ==========================================
  // 🔐 PERMISSIONS
  // ==========================================

  private loadPermissions(): void {
    const user = this.authService.getCurrentUser();
    const isAdmin = user?.role === 'RH' ||
                    user?.role === 'SUPER_ADMIN' ||
                    user?.role === 'TOP_MANAGER' ||
                    user?.roles?.includes('RH') ||
                    user?.roles?.includes('SUPER_ADMIN') ||
                    user?.roles?.includes('TOP_MANAGER') ||
                    user?.permissions?.includes('*');

    if (isAdmin) {
      this.canViewAllPositions.set(true);
      this.canViewPosition.set(true);
      this.canCreatePosition.set(true);
      this.canUpdatePosition.set(true);
      this.canDeletePosition.set(true);
      this.canTogglePosition.set(true);
      return;
    }

    this.canViewAllPositions.set(this.permissionService.hasPermissionSync('POSITION_VIEW_ALL'));
    this.canViewPosition.set(this.permissionService.hasPermissionSync('POSITION_VIEW'));
    this.canCreatePosition.set(this.permissionService.hasPermissionSync('POSITION_CREATE'));
    this.canUpdatePosition.set(this.permissionService.hasPermissionSync('POSITION_UPDATE'));
    this.canDeletePosition.set(this.permissionService.hasPermissionSync('POSITION_DELETE'));
    this.canTogglePosition.set(this.permissionService.hasPermissionSync('POSITION_TOGGLE'));
  }

  // ==========================================
  // 📦 CHARGEMENT DES DONNÉES
  // ==========================================

  private loadDepartementsAndPostes(): void {
    // Charger d'abord les départements, puis les postes
    this.loadingDepartements.set(true);
    const sub = this.departementService.getAll().subscribe({
      next: (data: Departement[]) => {
        this.departements.set(data);
        this.loadingDepartements.set(false);
        // Une fois les départements chargés, charger les postes
        this.loadPostes();
      },
      error: (err) => {
        console.error('Erreur chargement départements:', err);
        this.loadingDepartements.set(false);
        // Fallback
        this.departements.set([
          { id: '1', name: 'Informatique', entrepriseId: '1' },
          { id: '2', name: 'Ressources Humaines', entrepriseId: '1' },
          { id: '3', name: 'Finance', entrepriseId: '1' }
        ]);
        // Même avec fallback, charger les postes
        this.loadPostes();
      }
    });
    this.subscriptions.push(sub);
  }

  initPoste(): Poste {
    const now = new Date().toISOString();
    return {
      id: '',
      code: '',
      libelle: '',
      description: '',
      active: true,
      createdAt: now,
      createdBy: 'SYSTEM',
      updatedBy: null,
      updatedAt: now,
      departement: { id: '', name: '', entrepriseId: '' }
    };
  }

  loadPostes(): void {
    if (!this.canViewAllPositions()) {
      this.errorMessage.set('Permission refusée');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const sub = this.postesService.getAll().subscribe({
      next: (data: Poste[]) => {
        // Enrichir avec le nom du département si nécessaire
        const enriched = data.map(p => ({
          ...p,
          departement: p.departement || { id: p.departementId || '', name: this.getDepartementName(p.departementId || ''), entrepriseId: '' }
        }));
        this.postes.set(enriched);
        this.filteredPostes.set([...enriched]);
        this.loading.set(false);
        this.currentPage.set(1);
      },
      error: (err: any) => {
        console.error('Erreur chargement postes:', err);
        this.errorMessage.set(err.message || 'Erreur de chargement');
        this.loading.set(false);
        // Mock data
        const now = new Date().toISOString();
        const mock = [
          { id: '1', code: 'DEV-001', libelle: 'Développeur Full Stack', description: 'Développement web', active: true, createdAt: now, createdBy: 'SYSTEM', updatedBy: null, updatedAt: now, departement: { id: '1', name: 'Informatique', entrepriseId: '1' } }
        ];
        this.postes.set(mock);
        this.filteredPostes.set([...mock]);
        this.currentPage.set(1);
      }
    });

    this.subscriptions.push(sub);
  }

  // ==========================================
  // 🛠 RÉCUPÉRATION DU NOM DU DÉPARTEMENT
  // ==========================================

  getDepartementName(departementId: string | undefined | null): string {
    if (!departementId) return 'Non assigné';
    const dept = this.departements().find(d => d.id === departementId);
    return dept ? dept.name : 'Non assigné';
  }

  // ==========================================
  // 🪟 MODALE
  // ==========================================

  openModal(): void {
    if (!this.canCreatePosition()) {
      this.showError('Permission refusée');
      return;
    }
    this.posteForm = this.initPoste();
    this.isEditMode = false;
    this.selectedId = null;
    this.errorMessage.set(null);
    this.submitted = false;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    document.body.style.overflow = '';
    this.reset();
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  // ==========================================
  // 💾 SAUVEGARDE
  // ==========================================

  save(): void {
    this.submitted = true;

    if (!this.posteForm.code?.trim()) {
      this.showError('Le code est requis');
      return;
    }
    if (!this.posteForm.libelle?.trim()) {
      this.showError('Le libellé est requis');
      return;
    }

    if (this.isEditMode && !this.canUpdatePosition()) {
      this.showError('Permission refusée');
      return;
    }
    if (!this.isEditMode && !this.canCreatePosition()) {
      this.showError('Permission refusée');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const posteData = {
      code: this.posteForm.code.trim(),
      libelle: this.posteForm.libelle.trim(),
      description: this.posteForm.description?.trim() || '',
      active: this.posteForm.active,
      departementId: this.posteForm.departement?.id || ''
    };

    if (this.isEditMode && this.selectedId) {
      const sub = this.postesService.update(this.selectedId, posteData).subscribe({
        next: () => {
          this.loading.set(false);
          this.closeModal();
          this.loadPostes();
          this.showSuccess('✅ Poste mis à jour');
        },
        error: (err) => {
          this.loading.set(false);
          this.showError(err.message || 'Erreur de mise à jour');
        }
      });
      this.subscriptions.push(sub);
    } else {
      const sub = this.postesService.create(posteData).subscribe({
        next: () => {
          this.loading.set(false);
          this.closeModal();
          this.loadPostes();
          this.showSuccess('✅ Poste créé');
        },
        error: (err) => {
          this.loading.set(false);
          this.showError(err.message || 'Erreur de création');
        }
      });
      this.subscriptions.push(sub);
    }
  }

  edit(poste: Poste): void {
    if (!this.canUpdatePosition()) {
      this.showError('Permission refusée');
      return;
    }
    this.posteForm = {
      ...poste,
      departement: poste.departement || { id: '', name: '', entrepriseId: '' }
    };
    this.selectedId = poste.id || null;
    this.isEditMode = true;
    this.errorMessage.set(null);
    this.submitted = false;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  delete(id: string): void {
    if (!this.canDeletePosition()) {
      this.showError('Permission refusée');
      return;
    }
    if (!confirm('Supprimer ce poste ?')) return;
    this.loading.set(true);
    const sub = this.postesService.delete(id).subscribe({
      next: () => {
        this.loading.set(false);
        this.loadPostes();
        this.showSuccess('✅ Poste supprimé');
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(err.message || 'Erreur de suppression');
      }
    });
    this.subscriptions.push(sub);
  }

  toggle(id: string): void {
    if (!this.canTogglePosition()) {
      this.showError('Permission refusée');
      return;
    }
    this.loading.set(true);
    const sub = this.postesService.toggleActive(id).subscribe({
      next: () => {
        this.loading.set(false);
        this.loadPostes();
        this.showSuccess('✅ Statut modifié');
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(err.message || 'Erreur de changement de statut');
      }
    });
    this.subscriptions.push(sub);
  }

  // ==========================================
  // 🔍 RECHERCHE
  // ==========================================

  search(): void {
    if (!this.searchText.trim()) {
      this.filteredPostes.set([...this.postes()]);
      return;
    }
    const value = this.searchText.toLowerCase().trim();
    const filtered = this.postes().filter(p =>
      p.code?.toLowerCase().includes(value) ||
      p.libelle?.toLowerCase().includes(value) ||
      p.description?.toLowerCase().includes(value)
    );
    this.filteredPostes.set(filtered);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchText = '';
    this.filteredPostes.set([...this.postes()]);
    this.currentPage.set(1);
  }

  // ==========================================
  // 📄 PAGINATION
  // ==========================================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.set(this.currentPage() - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.set(this.currentPage() + 1);
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

  // ==========================================
  // 🛠 UTILITAIRES
  // ==========================================

  reset(): void {
    this.posteForm = this.initPoste();
    this.selectedId = null;
    this.isEditMode = false;
    this.errorMessage.set(null);
    this.submitted = false;
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => {
      if (this.errorMessage() === message) this.errorMessage.set(null);
    }, 5000);
  }

  private showSuccess(message: string): void {
    console.log('✅', message);
    // Vous pouvez ajouter un toast ici si vous en avez un
  }
}