// src/app/features/rh/gestion-conges-rh/gestion-conges-rh.component.ts

import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CongeService } from '../../../core/services/conge.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Conge, StatutConge, TypeConge } from '../../../core/models/conge.model';

@Component({
  selector: 'app-gestion-conges-rh',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gestion-conges-rh.component.html',
  styleUrls: ['./gestion-conges-rh.component.css']
})
export class GestionCongesRhComponent implements OnInit {
  private congeService = inject(CongeService);
  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);

  conges = signal<Conge[]>([]);
  filteredConges = signal<Conge[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
  // Filtres
  selectedStatut: string = 'TOUS';
  selectedType: string = 'TOUS';
  searchTerm: string = '';
  dateDebut: string = '';
  dateFin: string = '';
  
  statutOptions = ['TOUS', 'EN_ATTENTE', 'APPROUVE', 'REJETE', 'ANNULE'];
  typeOptions = ['TOUS', 'ANNUEL', 'MALADIE', 'PERMISSION', 'ABSENCE'];
  
  stats = signal({
    total: 0,
    enAttente: 0,
    approuve: 0,
    rejete: 0,
    annule: 0,
    enCours: 0,
    aVenir: 0,
    absences: 0,
    permissions: 0
  });

  // ============ PERMISSIONS ============
  canViewAllLeaves = signal(true);
  canApproveLeave = signal(true);
  canRejectLeave = signal(true);

  // ============ PAGINATION ============
  currentPage = signal(1);
  itemsPerPage = 10;
  Math = Math;

  // ============ COMPUTED ============
  totalPages = computed(() => {
    const total = this.filteredConges().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedConges = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredConges().slice(startIndex, endIndex);
  });

  showValidationModal = signal(false);
  selectedConge = signal<Conge | null>(null);
  validationComment = '';
  validationAction: 'approve' | 'reject' = 'approve';

  constructor() {
    // Réinitialiser la page quand les filtres changent
    effect(() => {
      this.filteredConges();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.loadData();
  }

  // ==========================================
  //  PERMISSIONS
  // ==========================================

  private loadPermissions(): void {
    console.log(' Chargement des permissions Gestion des congés RH...');
    
    const user = this.authService.getCurrentUser();
    console.log('Utilisateur connecté:', user);
    console.log('Rôle:', user?.role);
    
    //  Si l'utilisateur est RH, SUPER_ADMIN ou TOP_MANAGER, activer toutes les permissions
    const isAdmin = user?.role === 'RH' || 
                    user?.role === 'SUPER_ADMIN' || 
                    user?.role === 'TOP_MANAGER' ||
                    user?.role === 'DIRECTION' ||
                    user?.roles?.includes('RH') ||
                    user?.roles?.includes('SUPER_ADMIN') ||
                    user?.roles?.includes('TOP_MANAGER') ||
                    user?.roles?.includes('DIRECTION') ||
                    user?.permissions?.includes('*');

    if (isAdmin) {
      console.log(' Admin détecté - Activation de toutes les permissions congés');
      this.canViewAllLeaves.set(true);
      this.canApproveLeave.set(true);
      this.canRejectLeave.set(true);
      return;
    }

    // Pour les autres rôles, charger les permissions normalement
    this.canViewAllLeaves.set(this.permissionService.hasPermissionSync('LEAVE_VIEW_ALL'));
    this.canApproveLeave.set(this.permissionService.hasPermissionSync('LEAVE_APPROVE'));
    this.canRejectLeave.set(this.permissionService.hasPermissionSync('LEAVE_REJECT'));

    console.log('🔐 Permissions Congés RH chargées:', {
      canViewAllLeaves: this.canViewAllLeaves(),
      canApproveLeave: this.canApproveLeave(),
      canRejectLeave: this.canRejectLeave(),
    });
  }

  loadData(): void {
    if (!this.canViewAllLeaves()) {
      this.errorMessage.set('Vous n\'avez pas la permission de voir toutes les demandes de congés.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.congeService.getAll().subscribe({
      next: (data) => {
        this.conges.set(data);
        this.updateStats();
        this.applyFilters();
        this.loading.set(false);
        this.currentPage.set(1);
      },
      error: (error) => {
        console.error('Erreur chargement congés:', error);
        this.errorMessage.set('Impossible de charger les demandes de congés.');
        this.loading.set(false);
      }
    });
  }

  // ... (le reste du code reste identique)

  updateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const allConges = this.conges();
    
    this.stats.set({
      total: allConges.length,
      enAttente: allConges.filter(c => c.statut === StatutConge.EN_ATTENTE).length,
      approuve: allConges.filter(c => c.statut === StatutConge.APPROUVE).length,
      rejete: allConges.filter(c => c.statut === StatutConge.REJETE).length,
      annule: allConges.filter(c => c.statut === StatutConge.ANNULE).length,
      enCours: allConges.filter(c => {
        if (c.statut !== StatutConge.APPROUVE) return false;
        const debut = new Date(c.jourDebut);
        const fin = new Date(c.jourFin);
        return debut <= today && fin >= today;
      }).length,
      aVenir: allConges.filter(c => {
        if (c.statut !== StatutConge.APPROUVE) return false;
        const debut = new Date(c.jourDebut);
        return debut > today;
      }).length,
      absences: allConges.filter(c => c.typeConge === TypeConge.ABSENCE).length,
      permissions: allConges.filter(c => c.typeConge === TypeConge.PERMISSION).length
    });
  }

  applyFilters(): void {
    const allConges = this.conges();
    
    const filtered = allConges.filter(c => {
      let match = true;
      
      if (this.selectedStatut !== 'TOUS' && c.statut !== this.selectedStatut) {
        match = false;
      }
      
      if (this.selectedType !== 'TOUS' && c.typeConge !== this.selectedType) {
        match = false;
      }
      
      if (this.searchTerm && c.employee) {
        const employee = c.employee as any;
        const prenom = employee.prenom || '';
        const nom = employee.nom || '';
        const employeeName = `${prenom} ${nom}`.toLowerCase();
        
        const matricule1 = employee.matriculeInterne || '';
        const matricule2 = employee.matricule_interne || '';
        const matricule = matricule1 || matricule2;
        
        const search = this.searchTerm.toLowerCase();
        
        const matchName = employeeName.includes(search);
        const matchMatricule = matricule.toLowerCase().includes(search);
        
        if (!matchName && !matchMatricule) {
          match = false;
        }
      }
      
      if (this.dateDebut) {
        const dateDebut = new Date(this.dateDebut);
        const congeFin = new Date(c.jourFin);
        if (congeFin < dateDebut) {
          match = false;
        }
      }
      
      if (this.dateFin) {
        const dateFin = new Date(this.dateFin);
        const congeDebut = new Date(c.jourDebut);
        if (congeDebut > dateFin) {
          match = false;
        }
      }
      
      return match;
    });
    
    this.filteredConges.set(filtered);
    this.currentPage.set(1);
  }

  // ============ PAGINATION METHODS ============
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      document.querySelector('.conge-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedStatut = 'TOUS';
    this.selectedType = 'TOUS';
    this.searchTerm = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.applyFilters();
  }

  // ==========================================
  //  MODALE DE VALIDATION
  // ==========================================

  openValidationModal(conge: Conge, action: 'approve' | 'reject'): void {
    //  Vérifier les permissions
    if (action === 'approve' && !this.canApproveLeave()) {
      this.errorMessage.set('Vous n\'avez pas la permission d\'approuver des congés.');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }
    
    if (action === 'reject' && !this.canRejectLeave()) {
      this.errorMessage.set('Vous n\'avez pas la permission de rejeter des congés.');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    if (conge.statut !== StatutConge.EN_ATTENTE) {
      this.errorMessage.set('Ce congé a déjà été traité.');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }
    
    this.selectedConge.set(conge);
    this.validationAction = action;
    this.validationComment = '';
    this.showValidationModal.set(true);
  }

  closeValidationModal(): void {
    this.showValidationModal.set(false);
    this.selectedConge.set(null);
    this.validationComment = '';
  }

  confirmValidation(): void {
    const selectedConge = this.selectedConge();
    if (!selectedConge || !selectedConge.id) {
      this.errorMessage.set('Aucun congé sélectionné.');
      return;
    }
    
    const id = selectedConge.id;
    const managerId = this.authService.getCurrentEmployeeId() || 'RH001';
    
    this.loading.set(true);
    this.errorMessage.set('');
    
    if (this.validationAction === 'approve') {
      this.congeService.approve(id, managerId, this.validationComment).subscribe({
        next: () => {
          this.successMessage.set('Congé approuvé avec succès !');
          this.closeValidationModal();
          setTimeout(() => this.successMessage.set(''), 3000);
          this.loadData();
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Erreur lors de l\'approbation.');
          this.loading.set(false);
          setTimeout(() => this.errorMessage.set(''), 5000);
        }
      });
    } else {
      this.congeService.reject(id, managerId, this.validationComment).subscribe({
        next: () => {
          this.successMessage.set('Congé rejeté avec succès !');
          this.closeValidationModal();
          setTimeout(() => this.successMessage.set(''), 3000);
          this.loadData();
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Erreur lors du rejet.');
          this.loading.set(false);
          setTimeout(() => this.errorMessage.set(''), 5000);
        }
      });
    }
  }

  // ============ MÉTHODES UTILITAIRES ============

  statutClass(statut: string): string {
    const classes: Record<string, string> = {
      'APPROUVE': 'status-approved',
      'REJETE': 'status-rejected',
      'ANNULE': 'status-cancelled',
      'EN_ATTENTE': 'status-pending'
    };
    return classes[statut] || '';
  }

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      'APPROUVE': 'Approuvé',
      'REJETE': 'Rejeté',
      'ANNULE': 'Annulé',
      'EN_ATTENTE': 'En attente'
    };
    return labels[statut] || statut;
  }

  getStatusIcon(statut: string): string {
    const icons: Record<string, string> = {
      'APPROUVE': '',
      'REJETE': '',
      'ANNULE': '',
      'EN_ATTENTE': ''
    };
    return icons[statut] || '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEmployeeName(employee: any): string {
    if (!employee) return 'N/A';
    
    const prenom = employee.prenom || '';
    const nom = employee.nom || '';
    const name = `${prenom} ${nom}`.trim();
    
    if (name) return name;
    
    return this.getEmployeeMatricule(employee) || 'N/A';
  }

  getEmployeeMatricule(employee: any): string {
    if (!employee) return 'N/A';
    return employee.matriculeInterne || employee.matricule_interne || 'N/A';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ANNUEL': 'Congé annuel',
      'MALADIE': 'Maladie',
      'PERMISSION': 'Permission',
      'ABSENCE': 'Absence signalée'
    };
    return labels[type] || type;
  }

  isActionAllowed(conge: Conge): boolean {
    return conge.statut === StatutConge.EN_ATTENTE && conge.typeConge === TypeConge.ANNUEL;
  }
}