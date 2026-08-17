// src/app/features/discipline/components/demande-explication/mes-demandes/mes-demandes.component.ts

import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DisciplineService } from '../../../services/discipline.service';
import { DemandeExplication, StatutDemandeExplication } from '../../../models/demande-explication.model';
import { Page } from '../../../../../shared/models/page.model';
import { AuthService } from '../../../../../services/auth.service';
import { EmployeService } from '../../../../../core/services/employe.service';
import { Employee } from '../../../../../core/models/employee.model';
import { DemandeExplicationActionsModalComponent } from '../demande-explication-actions-modal/demande-explication-actions-modal.component';

@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule
  ],
  providers: [DatePipe],
  templateUrl: './mes-demandes.component.html',
  styleUrls: ['./mes-demandes.component.scss']
})
export class MesDemandesComponent implements OnInit {
  StatutDemandeExplication = StatutDemandeExplication;

  allData: DemandeExplication[] = [];
  totalElements = 0;
  isLoading = false;
  currentEmployee: Employee | null = null;
  processingId: string | null = null; // ✅ Pour suivre quelle demande est en cours

  // Filtres
  searchTerm: string = '';
  selectedStatut: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  Math = Math;

  // Options
  statutOptions = Object.values(StatutDemandeExplication);
  filteredData: WritableSignal<DemandeExplication[]> = signal<DemandeExplication[]>([]);

  constructor(
    private disciplineService: DisciplineService,
    private authService: AuthService,
    private employeService: EmployeService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadCurrentEmployee();
  }

  loadCurrentEmployee(): void {
    this.isLoading = true;
    
    const currentUserId = this.authService.getCurrentUserId();
    
    if (!currentUserId) {
      this.isLoading = false;
      this.snackBar.open('Vous devez être connecté pour voir vos demandes', 'Fermer', { duration: 3000 });
      return;
    }

    this.employeService.getByUserId(currentUserId).subscribe({
      next: (employee) => {
        this.currentEmployee = employee;
        if (employee && employee.id) {
          this.loadDemandes(employee.id);
        } else {
          this.isLoading = false;
          this.snackBar.open('Impossible de récupérer vos informations', 'Fermer', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'employé:', error);
        this.isLoading = false;
        if (error.status === 404) {
          this.snackBar.open('Aucun employé associé à votre compte', 'Fermer', { duration: 3000 });
        } else if (error.status === 401) {
          this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open('Erreur lors du chargement de vos informations', 'Fermer', { duration: 3000 });
        }
      }
    });
  }

  loadDemandes(employeeId: string): void {
    this.isLoading = true;
    
    const params = {
      page: 0,
      size: 1000,
      sort: 'createdAt,desc'
    };

    this.disciplineService.getDemandesByEmployee(employeeId, params).subscribe({
      next: (page: Page<DemandeExplication>) => {
        this.allData = page.content;
        this.totalElements = page.totalElements;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement:', error);
        this.isLoading = false;
        if (error.status === 401) {
          this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
        } else if (error.status === 404) {
          this.snackBar.open('Aucune demande trouvée', 'Fermer', { duration: 3000 });
        } else if (error.status === 403) {
          this.snackBar.open('Vous n\'avez pas la permission de voir ces demandes.', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open('Erreur lors du chargement de vos demandes', 'Fermer', { duration: 3000 });
        }
      }
    });
  }

  applyFilters(): void {
    let data = this.allData;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(d => 
        d.numero?.toLowerCase().includes(term) ||
        d.objet?.toLowerCase().includes(term) ||
        d.auteurNom?.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatut) {
      data = data.filter(d => d.statut === this.selectedStatut);
    }

    this.filteredData.set(data);
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearFilter(): void {
    this.selectedStatut = '';
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatut = '';
    this.applyFilters();
  }

  get paginatedData(): DemandeExplication[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredData().slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredData().length / this.itemsPerPage);
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    const maxVisible = 5;

    if (total <= maxVisible + 2) {
      for (let i = 2; i < total; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(2, current - 1);
      let end = Math.min(total - 1, current + 1);
      
      if (current <= 3) {
        end = 4;
      }
      if (current >= total - 2) {
        start = total - 3;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  viewDemande(id: string): void {
    const demande = this.allData.find(d => d.id === id);
    if (demande) {
      this.openDetailModal(demande);
    }
  }

  // ✅ VERSION CORRIGÉE : Fonctionne au premier clic
  markAsReplied(id: string): void {
    // ✅ Empêcher les clics multiples
    if (this.processingId === id) {
      return;
    }

    const demande = this.allData.find(d => d.id === id);
    if (!demande) {
      this.snackBar.open('Demande non trouvée', 'Fermer', { duration: 3000 });
      return;
    }

    // Vérifier que la demande est en attente
    if (demande.statut !== StatutDemandeExplication.EN_ATTENTE) {
      this.snackBar.open('Cette demande n\'est plus en attente', 'Fermer', { duration: 3000 });
      return;
    }

    // ✅ Confirmation simple et efficace
    if (!confirm(`Confirmez-vous avoir répondu par email à la demande "${demande.objet}" ?`)) {
      return;
    }

    // ✅ Marquer comme en cours
    this.processingId = id;

    this.disciplineService.markAsReplied(id).subscribe({
      next: (updatedDemande) => {
        this.processingId = null;
        
        // ✅ Snackbar de succès
        this.snackBar.open('✅ Demande marquée comme répondue avec succès !', 'Fermer', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Mettre à jour la liste
        const index = this.allData.findIndex(d => d.id === id);
        if (index !== -1) {
          this.allData[index] = updatedDemande;
          this.applyFilters();
        }
      },
      error: (error) => {
        this.processingId = null;
        console.error('Erreur:', error);
        
        let errorMessage = 'Erreur lors de la mise à jour';
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission de faire cette action.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        // ✅ Snackbar d'erreur
        this.snackBar.open('❌ ' + errorMessage, 'Fermer', { 
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        
        // Rafraîchir la liste pour mettre à jour le statut
        if (this.currentEmployee?.id) {
          this.loadDemandes(this.currentEmployee.id);
        }
      }
    });
  }

  // ✅ Vérifier si une demande est en cours de traitement
  isProcessing(id: string): boolean {
    return this.processingId === id;
  }

  canMarkAsReplied(statut: StatutDemandeExplication): boolean {
    return this.disciplineService.canMarkAsReplied(statut);
  }

  private openDetailModal(demande: DemandeExplication): void {
    const dialogRef = this.dialog.open(DemandeExplicationActionsModalComponent, {
      width: '100%',
      maxWidth: '980px',
      data: { 
        demande: demande, 
        action: 'view' 
      },
      disableClose: true,
      panelClass: 'modal-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'reply') {
        this.router.navigate(['/discipline/mes-demandes', result.id, 'reply']);
      }
    });
  }

  // ============================================
  // 📊 MÉTHODES DE STATUT
  // ============================================

  getStatutLabel(statut: StatutDemandeExplication): string {
    return this.disciplineService.getStatutLabel(statut);
  }

  getStatutClass(statut: StatutDemandeExplication): string {
    return this.disciplineService.getStatutClass(statut);
  }

  getStatutColor(statut: StatutDemandeExplication): string {
    return this.disciplineService.getStatutColor(statut);
  }

  canReply(statut: StatutDemandeExplication): boolean {
    return this.disciplineService.canReply(statut);
  }

  getStatCount(statut: StatutDemandeExplication): number {
    return this.allData.filter(d => d.statut === statut).length;
  }

  // ============================================
  // 📅 MÉTHODES DE DATE
  // ============================================

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe?.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
  }

  formatDateShort(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe?.transform(date, 'dd/MM/yyyy') || 'N/A';
  }

  isUrgent(dateLimite: any, statut: StatutDemandeExplication): boolean {
    if (!dateLimite || statut !== StatutDemandeExplication.EN_ATTENTE) return false;
    
    const now = new Date();
    const limite = new Date(dateLimite);
    const diffTime = limite.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 3 && diffDays >= 0;
  }

  isOverdue(dateLimite: any, statut: StatutDemandeExplication): boolean {
    if (!dateLimite || statut !== StatutDemandeExplication.EN_ATTENTE) return false;
    
    const now = new Date();
    const limite = new Date(dateLimite);
    return limite.getTime() < now.getTime();
  }

  getDaysRemaining(dateLimite: any): number | null {
    if (!dateLimite) return null;
    
    const now = new Date();
    const limite = new Date(dateLimite);
    const diffTime = limite.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}