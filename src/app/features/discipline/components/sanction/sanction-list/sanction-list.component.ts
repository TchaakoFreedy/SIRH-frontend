// src/app/features/discipline/components/sanction/sanction-list/sanction-list.component.ts

import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { SanctionService } from '../../../services/sanction.service';
import { Sanction, StatutSanction, StatutSanctionLabels, StatutSanctionColors, TypeSanctionLabels, TypeSanction } from '../../../models/sanction.model';
import { Page } from '../../../../../shared/models/page.model';

@Component({
  selector: 'app-sanction-list',
  standalone: true,
  templateUrl: './sanction-list.component.html',
  styleUrls: ['./sanction-list.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ]
})
export class SanctionListComponent implements OnInit {
  StatutSanction = StatutSanction;

  allData: Sanction[] = [];
  totalElements = 0;
  isLoading = false;

  searchTerm: string = '';
  selectedStatut: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  Math = Math;

  statutOptions = Object.values(StatutSanction);
  filteredData: WritableSignal<Sanction[]> = signal<Sanction[]>([]);

  constructor(
    private sanctionService: SanctionService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSanctions();
  }

  loadSanctions(): void {
    this.isLoading = true;
    const params = {
      page: 0,
      size: 1000,
      sort: 'createdAt,desc'
    };

    this.sanctionService.getSanctions(params).subscribe({
      next: (page: Page<Sanction>) => {
        this.allData = page.content;
        this.totalElements = page.totalElements;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
        if (error.status === 401) {
          this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open('Erreur lors du chargement des sanctions', 'Fermer', { duration: 3000 });
        }
      }
    });
  }

  applyFilters(): void {
    let data = this.allData;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(s => 
        s.numero?.toLowerCase().includes(term) ||
        s.employeNom?.toLowerCase().includes(term) ||
        s.motif?.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatut) {
      data = data.filter(s => s.statut === this.selectedStatut);
    }

    // Tri du plus récent au plus ancien selon la date de création (createdAt)
    data.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

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

  get paginatedData(): Sanction[] {
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

  viewSanction(id: string): void {
    console.log('Navigation vers le détail de la sanction:', id);
    
    localStorage.setItem('sanction_return_url', '/app/discipline/sanctions');
    
    this.router.navigate(
      ['/app/discipline/sanctions', id],
      { 
        queryParams: { returnUrl: '/app/discipline/sanctions' },
        state: { returnUrl: '/app/discipline/sanctions' }
      }
    ).then(
      success => {
        console.log('Navigation reussie:', success);
      },
      error => {
        console.error('Erreur de navigation:', error);
      }
    );
  }

  createSanction(): void {
    console.log('Navigation vers la creation de sanction');
    this.router.navigate(['/app/discipline/sanctions/create']);
  }

  liftSanction(id: string): void {
    if (confirm('Voulez-vous lever cette sanction ?')) {
      this.isLoading = true;
      this.sanctionService.liftSanction(id).subscribe({
        next: () => {
          this.snackBar.open('Sanction levee avec succes !', 'Fermer', { duration: 3000 });
          this.loadSanctions();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erreur:', error);
          this.snackBar.open('Erreur lors de la levee de la sanction', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  deleteSanction(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cette sanction ? Cette action est irreversible.')) {
      this.isLoading = true;
      this.sanctionService.deleteSanction(id).subscribe({
        next: () => {
          this.snackBar.open('Sanction supprimee', 'Fermer', { duration: 3000 });
          this.loadSanctions();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erreur:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getTypeLabel(type: TypeSanction): string {
    return TypeSanctionLabels[type] || type;
  }

  getTypeClass(type: TypeSanction): string {
    const classes: Record<TypeSanction, string> = {
      [TypeSanction.AVERTISSEMENT_VERBAL]: 'avertissement_verbal',
      [TypeSanction.AVERTISSEMENT_ECRIT]: 'avertissement_ecrit',
      [TypeSanction.BLAME]: 'blame',
      [TypeSanction.MISE_A_PIED]: 'mise_a_pied',
      [TypeSanction.SUSPENSION]: 'suspension',
      [TypeSanction.MUTATION_DISCIPLINAIRE]: 'mutation_disciplinaire',
      [TypeSanction.LICENCIEMENT]: 'licenciement',
      [TypeSanction.AUTRE]: 'autre'
    };
    return classes[type] || '';
  }

  getTypeIcon(type: TypeSanction): string {
    const icons: Record<TypeSanction, string> = {
      [TypeSanction.AVERTISSEMENT_VERBAL]: 'chat',
      [TypeSanction.AVERTISSEMENT_ECRIT]: 'description',
      [TypeSanction.BLAME]: 'warning',
      [TypeSanction.MISE_A_PIED]: 'hourglass_empty',
      [TypeSanction.SUSPENSION]: 'pause_circle',
      [TypeSanction.MUTATION_DISCIPLINAIRE]: 'swap_horiz',
      [TypeSanction.LICENCIEMENT]: 'cancel',
      [TypeSanction.AUTRE]: 'more_horiz'
    };
    return icons[type] || 'help';
  }

  getStatutLabel(statut: StatutSanction): string {
    return StatutSanctionLabels[statut] || statut;
  }

  getStatutClass(statut: StatutSanction): string {
    const classes: Record<StatutSanction, string> = {
      [StatutSanction.ACTIVE]: 'active',
      [StatutSanction.TERMINEE]: 'terminee',
      [StatutSanction.ANNULEE]: 'annulee'
    };
    return classes[statut] || '';
  }

  canDelete(statut: StatutSanction): boolean {
    return statut !== StatutSanction.ACTIVE;
  }

  getStatCount(statut: StatutSanction): number {
    return this.allData.filter(s => s.statut === statut).length;
  }

  trackById(index: number, item: Sanction): string {
    return item.id || index.toString();
  }
}