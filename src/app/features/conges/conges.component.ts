// src/app/features/rh/conges/conges.component.ts
import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CongeService } from '../../core/services/conge.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../core/services/permission.service'; // 👈 Ajout
import { Conge, StatutConge, TypeConge } from '../../core/models/conge.model';

@Component({
  selector: 'app-conges',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './conges.component.html',
  styleUrls: ['./conges.component.css']
})
export class CongesComponent implements OnInit {
  conges = signal<Conge[]>([]);
  filteredConges = signal<Conge[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
  selectedStatut: string = 'TOUS';
  statutOptions = ['TOUS', 'EN_ATTENTE', 'APPROUVE', 'REJETE', 'ANNULE'];
  
  // 👈 Permission pour créer
  canCreate = false;

  // ============ PAGINATION ============
  currentPage = signal(1);
  itemsPerPage = 10;
  Math = Math;

  // ============ COMPUTED FOR PAGINATION ============
  totalPages = computed(() => {
    const total = this.filteredConges().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedConges = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredConges().slice(startIndex, endIndex);
  });

  stats = signal({
    total: 0,
    enAttente: 0,
    approuve: 0,
    rejete: 0,
    annule: 0,
    absences: 0,
    permissions: 0
  });

  constructor(
    private congeService: CongeService,
    private authService: AuthService,
    private permissionService: PermissionService // 👈 Injection
  ) {
    effect(() => {
      this.filteredConges();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    // 👈 Vérification de la permission
    this.canCreate = this.permissionService.hasPermissionSync('LEAVE_CREATE');
    this.loadData();
  }

  loadData(): void {
    const matricule = this.authService.getCurrentEmployeeId();
    console.log('🔑 Matricule pour chargement congés:', matricule);
    
    if (!matricule) {
      this.errorMessage.set('Utilisateur non identifié.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.congeService.getByEmployee(matricule).subscribe({
      next: (data) => {
        console.log(' Congés chargés:', data.length);
        this.conges.set(data);
        this.updateStats();
        this.applyFilter();
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

  updateStats(): void {
    const allConges = this.conges();
    
    this.stats.set({
      total: allConges.length,
      enAttente: allConges.filter(c => c.statut === StatutConge.EN_ATTENTE).length,
      approuve: allConges.filter(c => c.statut === StatutConge.APPROUVE).length,
      rejete: allConges.filter(c => c.statut === StatutConge.REJETE).length,
      annule: allConges.filter(c => c.statut === StatutConge.ANNULE).length,
      absences: allConges.filter(c => c.typeConge === TypeConge.ABSENCE).length,
      permissions: allConges.filter(c => c.typeConge === TypeConge.PERMISSION).length
    });
  }

  applyFilter(): void {
    const allConges = this.conges();
    
    if (this.selectedStatut === 'TOUS') {
      this.filteredConges.set(allConges);
    } else {
      this.filteredConges.set(allConges.filter(c => c.statut === this.selectedStatut));
    }
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
    this.applyFilter();
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

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ANNUEL': 'Congé annuel',
      'MALADIE': 'Maladie',
      'PERMISSION': 'Permission',
      'ABSENCE': 'Absence'
    };
    return labels[type] || type;
  }

  annuler(id: string | undefined): void {
    if (!id) return;

    if (!confirm('Voulez-vous vraiment annuler cette demande de congé ?')) {
      return;
    }

    this.congeService.cancel(id).subscribe({
      next: () => {
        this.successMessage.set('Demande annulée avec succès !');
        setTimeout(() => this.successMessage.set(''), 3000);
        this.loadData();
      },
      error: (error) => {
        console.error('Erreur annulation:', error);
        this.errorMessage.set(error.message || 'Erreur lors de l\'annulation.');
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
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

  canCancel(conge: Conge): boolean {
    return conge.statut === StatutConge.EN_ATTENTE;
  }

  getAbsenceDays(): number {
    return this.conges()
      .filter(c => c.typeConge === TypeConge.ABSENCE && c.statut === StatutConge.APPROUVE)
      .reduce((sum, c) => sum + (c.nbJour || 0), 0);
  }

  getPermissionDays(): number {
    return this.conges()
      .filter(c => c.typeConge === TypeConge.PERMISSION && c.statut === StatutConge.APPROUVE)
      .reduce((sum, c) => sum + (c.nbJour || 0), 0);
  }
}