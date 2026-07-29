import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CongeService } from '../../../core/services/conge.service';
import { EmployeService } from '../../../core/services/employe.service';
import { Conge, StatutConge, TypeConge } from '../../../core/models/conge.model';
import { Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-historique-conges',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './historique-conges.component.html',
  styleUrls: ['./historique-conges.component.css']
})
export class HistoriqueCongesComponent implements OnInit {
  conges = signal<Conge[]>([]);
  filteredConges = signal<Conge[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  
  selectedAnnee: number = new Date().getFullYear();
  selectedStatut: string = 'TOUS';
  searchTerm: string = '';
  
  annees: number[] = [];
  statutOptions = ['TOUS', 'APPROUVE', 'REJETE', 'ANNULE', 'EN_ATTENTE'];
  
  // Cache des employés pour afficher les noms
  employeesMap: Map<string, Employee> = new Map();
  employeesLoading = false;
  
  // ============ PAGINATION ============
  currentPage = signal(1);
  itemsPerPage = 10;
  Math = Math;

  totalPages = computed(() => {
    const total = this.filteredConges().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedConges = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredConges().slice(startIndex, endIndex);
  });

  statsAnnuelles = signal({
    total: 0,
    approuve: 0,
    rejete: 0,
    annule: 0,
    enAttente: 0,
    joursPris: 0
  });

  constructor(
    private congeService: CongeService,
    private employeService: EmployeService
  ) {
    effect(() => {
      this.filteredConges();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.generateAnnees();
    this.loadData();
  }

  generateAnnees(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      this.annees.push(year);
    }
  }

  /**
   * Charge toutes les demandes de congé et tous les employés
   */
  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // Charger tous les employés d'abord
    this.employeesLoading = true;
    this.employeService.getAll().subscribe({
      next: (employees) => {
        employees.forEach(emp => {
          if (emp.id) this.employeesMap.set(emp.id, emp);
        });
        this.employeesLoading = false;
        // Puis charger les congés
        this.loadConges();
      },
      error: (err) => {
        console.error('Erreur chargement employés:', err);
        this.employeesLoading = false;
        // On continue quand même pour charger les congés (mais les noms seront manquants)
        this.loadConges();
      }
    });
  }

  private loadConges(): void {
    this.congeService.getAll().subscribe({
      next: (data) => {
        this.conges.set(data);
        this.applyFilters();
        this.calculateAnnualStats();
        this.loading.set(false);
        this.currentPage.set(1);
      },
      error: (error) => {
        console.error('Erreur chargement historique:', error);
        this.errorMessage.set('Impossible de charger l\'historique des congés.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Récupère le nom d'un employé à partir de son ID (depuis le cache)
   */
  getEmployeeNameById(employeeId: string | undefined): string {
    if (!employeeId) return 'N/A';
    const emp = this.employeesMap.get(employeeId);
    if (emp) {
      return `${emp.prenom || ''} ${emp.nom || ''}`.trim() || emp.matriculeInterne || 'N/A';
    }
    // Si l'employé n'est pas dans le cache, on le charge à la volée
    if (!this.employeesLoading) {
      this.employeService.getById(employeeId).subscribe({
        next: (employee) => {
          if (employee.id) this.employeesMap.set(employee.id, employee);
          this.applyFilters(); // rafraîchir l'affichage
        },
        error: () => {}
      });
    }
    return employeeId;
  }

  /**
   * Récupère le nom du validateur (même logique)
   */
  getValidatorName(managerId: string | undefined): string {
    return this.getEmployeeNameById(managerId);
  }

  applyFilters(): void {
    const allConges = this.conges();
    const filtered = allConges.filter(c => {
      let match = true;
      const date = new Date(c.jourDebut);
      if (date.getFullYear() !== this.selectedAnnee) match = false;
      if (this.selectedStatut !== 'TOUS' && c.statut !== this.selectedStatut) match = false;
      if (this.searchTerm) {
        const type = this.getTypeLabel(c.typeConge).toLowerCase();
        const statut = this.statutLabel(c.statut).toLowerCase();
        // Récupérer l'ID de l'employé de manière sécurisée
        const employeeId = c.employee?.id;
        const employeeName = employeeId ? this.getEmployeeNameById(employeeId).toLowerCase() : '';
        const search = this.searchTerm.toLowerCase();
        if (!type.includes(search) && !statut.includes(search) && !employeeName.includes(search)) {
          match = false;
        }
      }
      return match;
    });
    this.filteredConges.set(filtered);
    this.currentPage.set(1);
  }

  calculateAnnualStats(): void {
    const allConges = this.conges();
    const anneesConges = allConges.filter(c => {
      const date = new Date(c.jourDebut);
      return date.getFullYear() === this.selectedAnnee;
    });
    const joursPris = anneesConges
      .filter(c => c.statut === StatutConge.APPROUVE && c.typeConge === TypeConge.ANNUEL)
      .reduce((sum, c) => sum + (c.nbJour || 0), 0);
    this.statsAnnuelles.set({
      total: anneesConges.length,
      approuve: anneesConges.filter(c => c.statut === StatutConge.APPROUVE).length,
      rejete: anneesConges.filter(c => c.statut === StatutConge.REJETE).length,
      annule: anneesConges.filter(c => c.statut === StatutConge.ANNULE).length,
      enAttente: anneesConges.filter(c => c.statut === StatutConge.EN_ATTENTE).length,
      joursPris: joursPris
    });
  }

  // ============ PAGINATION ============
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      document.querySelector('.timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  onFilterChange(): void {
    this.applyFilters();
    this.calculateAnnualStats();
  }

  resetFilters(): void {
    this.selectedAnnee = new Date().getFullYear();
    this.selectedStatut = 'TOUS';
    this.searchTerm = '';
    this.applyFilters();
    this.calculateAnnualStats();
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
    return '';
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Pour le template : retourne l'objet employé s'il existe
   */
  getEmployeeForDisplay(conge: Conge): any {
    return conge.employee || null;
  }

  exportCSV(): void {
    const filtered = this.filteredConges();
    if (filtered.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }
    const headers = ['Employé', 'Type', 'Du', 'Au', 'Durée', 'Statut', 'Validé par', 'Commentaire'];
    const rows = filtered.map(c => {
      // Récupérer l'ID de l'employé de manière sécurisée
      const employeeId = c.employee?.id;
      const empName = employeeId ? this.getEmployeeNameById(employeeId) : 'N/A';
      return [
        empName,
        this.getTypeLabel(c.typeConge),
        this.formatDate(c.jourDebut),
        this.formatDate(c.jourFin),
        c.nbJour,
        this.statutLabel(c.statut),
        this.getValidatorName(c.managerId),
        c.commentaireManager || ''
      ];
    });
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => { csvContent += row.join(',') + '\n'; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historique_conges_${this.selectedAnnee}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getJoursParMois(): { mois: string, jours: number }[] {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const stats: { [key: string]: number } = {};
    mois.forEach(m => stats[m] = 0);
    this.conges()
      .filter(c => {
        const date = new Date(c.jourDebut);
        return date.getFullYear() === this.selectedAnnee &&
               c.statut === StatutConge.APPROUVE &&
               c.typeConge === TypeConge.ANNUEL;
      })
      .forEach(c => {
        const moisIndex = new Date(c.jourDebut).getMonth();
        const nomMois = mois[moisIndex];
        stats[nomMois] = (stats[nomMois] || 0) + (c.nbJour || 0);
      });
    return Object.entries(stats).map(([mois, jours]) => ({ mois, jours }));
  }

  // Solde restant global (non utilisé ici)
  getSoldeRestant(): number {
    return 0;
  }
}