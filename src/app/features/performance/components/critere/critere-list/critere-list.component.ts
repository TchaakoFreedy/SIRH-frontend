import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PerformanceService } from '../../../services/performance.service';
import { CriterePerformance } from '../../../models/critere-performance.model';

@Component({
  selector: 'app-critere-list',
  standalone: false,
  templateUrl: './critere-list.component.html',
  styleUrls: ['./critere-list.component.scss']
})
export class CritereListComponent implements OnInit {
  criteres: CriterePerformance[] = [];
  displayedColumns: string[] = ['nom', 'noteMaximale', 'coefficient', 'actif', 'actions'];
  isLoading = true;

  // Pagination properties
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex = 0;
  totalItems = 0;
  paginatedCriteres: CriterePerformance[] = [];

  constructor(
    private performanceService: PerformanceService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🔍 ngOnInit - Début du chargement');
    this.loadCriteres();
  }

  loadCriteres(): void {
    this.isLoading = true;
    console.log('📡 Chargement des critères...');
    
    this.performanceService.getCriteres().subscribe({
      next: (data: CriterePerformance[]) => {
        console.log('✅ Critères reçus du backend:', data);
        console.log('📊 Nombre de critères:', data.length);
        
        this.criteres = data;
        this.totalItems = data.length;
        this.updatePaginatedData();
        this.isLoading = false;
        this.cdr.detectChanges();
        
        console.log('🔓 isLoading = false, criteres.length =', this.criteres.length);
      },
      error: (error) => {
        console.error('❌ Erreur backend:', error);
        this.criteres = this.getTestData();
        this.totalItems = this.criteres.length;
        this.updatePaginatedData();
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Erreur lors du chargement des critères', 'Fermer', { duration: 3000 });
      }
    });
  }

  private getTestData(): CriterePerformance[] {
    return [
      { id: '1', nom: 'Ponctualité', description: 'Respect des horaires', noteMaximale: 10, coefficient: 1, actif: true },
      { id: '2', nom: 'Productivité', description: 'Volume de travail', noteMaximale: 20, coefficient: 2, actif: true },
      { id: '3', nom: 'Qualité du travail', description: 'Précision et soin', noteMaximale: 15, coefficient: 1.5, actif: true },
      { id: '4', nom: 'Collaboration', description: 'Travail en équipe', noteMaximale: 10, coefficient: 1, actif: false },
      { id: '5', nom: 'Autonomie', description: 'Capacité à travailler seul', noteMaximale: 15, coefficient: 1.2, actif: true },
      { id: '6', nom: 'Communication', description: 'Clarté et efficacité', noteMaximale: 10, coefficient: 1, actif: true },
      { id: '7', nom: 'Adaptabilité', description: 'Flexibilité face au changement', noteMaximale: 12, coefficient: 1.1, actif: false },
      { id: '8', nom: 'Gestion du stress', description: 'Résistance à la pression', noteMaximale: 8, coefficient: 0.8, actif: true },
      { id: '9', nom: 'Créativité', description: 'Innovation et idées nouvelles', noteMaximale: 12, coefficient: 1.2, actif: true },
      { id: '10', nom: 'Esprit d\'équipe', description: 'Travail collaboratif', noteMaximale: 10, coefficient: 1, actif: true },
      { id: '11', nom: 'Résolution de problèmes', description: 'Capacité à résoudre les problèmes', noteMaximale: 14, coefficient: 1.3, actif: true },
      { id: '12', nom: 'Leadership', description: 'Aptitude à diriger', noteMaximale: 16, coefficient: 1.5, actif: false }
    ];
  }

  updatePaginatedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);
    this.paginatedCriteres = this.criteres.slice(startIndex, endIndex);
    this.cdr.detectChanges();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.totalItems = event.length;
    this.updatePaginatedData();
  }

  createCritere(): void {
    this.router.navigate(['/app/performance/criteres/create']);
  }

  editCritere(id: string): void {
    this.router.navigate(['/app/performance/criteres/edit', id]);
  }

  deleteCritere(id: string): void {
    if (confirm('Voulez-vous supprimer ce critère ? Cette action est irréversible.')) {
      this.isLoading = true;
      this.performanceService.deleteCritere(id).subscribe({
        next: () => {
          this.snackBar.open('✅ Critère supprimé avec succès', 'Fermer', { duration: 3000 });
          this.loadCriteres();
        },
        error: (error) => {
          this.isLoading = false;
          this.cdr.detectChanges();
          console.error('❌ Erreur suppression critère:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getActiveCount(): number {
    return this.criteres.filter(c => c.actif).length;
  }

  getMoyenneNote(): string {
    if (this.criteres.length === 0) return 'N/A';
    const sum = this.criteres.reduce((acc, c) => acc + (c.noteMaximale || 0), 0);
    return (sum / this.criteres.length).toFixed(1);
  }

  // Pour afficher la plage d'éléments actuelle
  getCurrentRange(): string {
    const start = this.pageIndex * this.pageSize + 1;
    const end = Math.min((this.pageIndex + 1) * this.pageSize, this.totalItems);
    return `${start}-${end}`;
  }
}