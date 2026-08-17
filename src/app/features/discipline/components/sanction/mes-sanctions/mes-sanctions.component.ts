// src/app/features/discipline/components/sanction/mes-sanctions/mes-sanctions.component.ts

import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { SanctionService } from '../../../services/sanction.service';
import { Sanction, StatutSanction, StatutSanctionLabels, TypeSanctionLabels, TypeSanction } from '../../../models/sanction.model';
import { Page } from '../../../../../shared/models/page.model';

@Component({
  selector: 'app-mes-sanctions',
  standalone: true,
  templateUrl: './mes-sanctions.component.html',
  styleUrls: ['./mes-sanctions.component.scss'],
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
export class MesSanctionsComponent implements OnInit {
  StatutSanction = StatutSanction;
  
  sanctions: Sanction[] = [];
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
    this.loadMySanctions();
  }

  loadMySanctions(): void {
    this.isLoading = true;
    const params = {
      page: 0,
      size: 1000,
      sort: 'createdAt,desc'
    };

    this.sanctionService.getMySanctions(params).subscribe({
      next: (page: Page<Sanction>) => {
        this.sanctions = page.content;
        this.totalElements = page.totalElements;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement de vos sanctions', 'Fermer', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    let data = this.sanctions;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(s => 
        s.numero?.toLowerCase().includes(term) ||
        s.motif?.toLowerCase().includes(term)
      );
    }
    if (this.selectedStatut) {
      data = data.filter(s => s.statut === this.selectedStatut);
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
    if (total <= 7) {
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

  // ✅ Navigation avec URL de retour
  viewSanction(id: string): void {
    console.log('🔍 Navigation vers le détail de la sanction depuis Mes sanctions:', id);
    
    // Stocker l'URL de retour dans localStorage
    localStorage.setItem('sanction_return_url', '/app/discipline/mes-sanctions');
    
    this.router.navigate(
      ['/app/discipline/sanctions', id],
      { 
        queryParams: { returnUrl: '/app/discipline/mes-sanctions' },
        state: { returnUrl: '/app/discipline/mes-sanctions' }
      }
    ).then(
      success => {
        console.log('✅ Navigation réussie:', success);
      },
      error => {
        console.error('❌ Erreur de navigation:', error);
      }
    );
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
    return this.sanctionService.getTypeIcon(type);
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

  trackById(index: number, item: Sanction): string {
    return item.id || index.toString();
  }
}