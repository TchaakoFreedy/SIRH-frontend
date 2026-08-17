// src/app/features/discipline/components/demande-explication/demande-explication-list/demande-explication-list.component.ts

import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DisciplineService } from '../../../services/discipline.service';
import { DemandeExplication, StatutDemandeExplication } from '../../../models/demande-explication.model';
import { Page } from '../../../../../shared/models/page.model';
import { DemandeExplicationActionsModalComponent } from '../demande-explication-actions-modal/demande-explication-actions-modal.component';

@Component({
  selector: 'app-demande-explication-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  providers: [DatePipe],
  templateUrl: './demande-explication-list.component.html',
  styleUrls: ['./demande-explication-list.component.scss']
})
export class DemandeExplicationListComponent implements OnInit {
  StatutDemandeExplication = StatutDemandeExplication;

  allData: DemandeExplication[] = [];
  totalElements = 0;
  isLoading = false;

  searchTerm: string = '';
  selectedStatut: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  Math = Math;

  statutOptions = Object.values(StatutDemandeExplication);
  filteredData: WritableSignal<DemandeExplication[]> = signal<DemandeExplication[]>([]);

  constructor(
    private disciplineService: DisciplineService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.isLoading = true;
    const params = {
      page: 0,
      size: 1000,
      sort: 'createdAt,desc'
    };

    this.disciplineService.getDemandes(params).subscribe({
      next: (page: Page<DemandeExplication>) => {
        this.allData = page.content;
        this.totalElements = page.totalElements;
        this.applyFilters();
        this.isLoading = false;
        
        // ✅ Log pour vérifier les données importées
        console.log('📊 Demandes chargées:', this.allData.length);
        console.log('📊 Détails des demandes:', this.allData.map(d => ({
          numero: d.numero,
          objet: d.objet,
          statut: d.statut,
          employe: d.employeConcerneNom
        })));
      },
      error: (error) => {
        console.error('Erreur lors du chargement:', error);
        this.isLoading = false;
        if (error.status === 401) {
          this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open('Erreur lors du chargement des demandes', 'Fermer', { duration: 3000 });
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
        d.employeConcerneNom?.toLowerCase().includes(term) ||
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
      this.openActionModal(demande, 'view');
    }
  }

  editDemande(id: string): void {
    const demande = this.allData.find(d => d.id === id);
    if (demande) {
      this.openActionModal(demande, 'edit');
    }
  }

  deleteDemande(id: string): void {
    const demande = this.allData.find(d => d.id === id);
    if (demande) {
      this.openActionModal(demande, 'delete');
    }
  }

  /**
   * ✅ Naviguer vers la page d'import
   */
  goToImport(): void {
    this.router.navigate(['/app/discipline/demandes/import']);
  }

  private openActionModal(demande: DemandeExplication, action: 'view' | 'edit' | 'delete'): void {
    const dialogRef = this.dialog.open(DemandeExplicationActionsModalComponent, {
      width: '100%',
      maxWidth: '980px',
      data: { demande, action },
      disableClose: true,
      panelClass: 'modal-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'edit' && result.data) {
          const index = this.allData.findIndex(d => d.id === result.data.id);
          if (index !== -1) {
            this.allData[index] = result.data;
            this.applyFilters();
          }
          this.snackBar.open('Demande modifiée avec succès !', 'Fermer', { duration: 3000 });
        } else if (result.action === 'delete') {
          this.allData = this.allData.filter(d => d.id !== result.id);
          this.applyFilters();
          this.snackBar.open('Demande supprimée avec succès', 'Fermer', { duration: 3000 });
        } else if (result.action === 'reply') {
          this.router.navigate(['/discipline/demandes', result.id, 'reply']);
        }
      }
    });
  }

  createDemande(): void {
    this.router.navigate(['/discipline/demandes/create']);
  }

  getStatutLabel(statut: StatutDemandeExplication): string {
    return this.disciplineService.getStatutLabel(statut);
  }

  getStatutClass(statut: StatutDemandeExplication): string {
    const classes: Record<StatutDemandeExplication, string> = {
      [StatutDemandeExplication.EN_ATTENTE]: 'en-attente',
      [StatutDemandeExplication.REPONDUE]: 'repondue',
      [StatutDemandeExplication.VALIDEE]: 'validee',
      [StatutDemandeExplication.REJETEE]: 'rejetee',
      [StatutDemandeExplication.ANNULEE]: 'annulee'
    };
    return classes[statut] || '';
  }

  canEdit(statut: StatutDemandeExplication): boolean {
    return this.disciplineService.isEditable(statut);
  }

  canDelete(statut: StatutDemandeExplication): boolean {
    return statut === StatutDemandeExplication.EN_ATTENTE || 
           statut === StatutDemandeExplication.ANNULEE;
  }

  getStatCount(statut: StatutDemandeExplication): number {
    return this.allData.filter(d => d.statut === statut).length;
  }
}