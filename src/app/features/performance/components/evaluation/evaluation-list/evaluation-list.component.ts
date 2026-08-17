import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerformanceService } from '../../../services/performance.service';
import { EvaluationPerformance, MentionPerformanceLabels, MentionPerformanceColors } from '../../../models/evaluation-performance.model';
import { PeriodeEvaluationLabels } from '../../../models/periode-evaluation.enum';
import { Page } from '../../../../../shared/models/page.model';

@Component({
  selector: 'app-evaluation-list',
  standalone: false,
  templateUrl: './evaluation-list.component.html',
  styleUrls: ['./evaluation-list.component.scss']
})
export class EvaluationListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['employeNom', 'periode', 'annee', 'pourcentage', 'mention', 'dateEvaluation', 'actions'];
  dataSource = new MatTableDataSource<EvaluationPerformance>();
  totalElements = 0;
  isLoading = false;
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private performanceService: PerformanceService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEvaluations();
  }

  ngAfterViewInit(): void {
    // Synchronisation du paginator avec les valeurs par défaut
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator.pageIndex = this.pageIndex;
    }
  }

  loadEvaluations(): void {
    this.isLoading = true;
    
    // Récupération des paramètres de pagination et tri
    const page = this.paginator?.pageIndex ?? this.pageIndex;
    const size = this.paginator?.pageSize ?? this.pageSize;
    const sortField = this.sort?.active || 'createdAt';
    const sortDirection = this.sort?.direction || 'desc';
    const sort = `${sortField},${sortDirection}`;

    const params = {
      page: page,
      size: size,
      sort: sort
    };

    console.log('Chargement des évaluations avec params:', params);

    this.performanceService.getEvaluations(params).subscribe({
      next: (pageData: Page<EvaluationPerformance>) => {
        this.dataSource.data = pageData.content;
        this.totalElements = pageData.totalElements;
        this.pageSize = pageData.size;
        this.pageIndex = pageData.number;
        this.isLoading = false;
        
        // Mise à jour du paginator
        if (this.paginator) {
          this.paginator.length = pageData.totalElements;
          this.paginator.pageSize = pageData.size;
          this.paginator.pageIndex = pageData.number;
        }
        
        console.log('Évaluations chargées:', pageData.content.length, 'sur', pageData.totalElements);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des évaluations:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des évaluations', 'Fermer', { duration: 3000 });
      }
    });
  }

  onPageChange(): void {
    console.log('Changement de page:', this.paginator?.pageIndex, this.paginator?.pageSize);
    this.loadEvaluations();
  }

  onSortChange(): void {
    console.log('Changement de tri:', this.sort?.active, this.sort?.direction);
    this.loadEvaluations();
  }

  viewEvaluation(id: string): void {
    this.router.navigate(['/app/performance/evaluations', id]);
  }

  editEvaluation(id: string): void {
    this.router.navigate(['/app/performance/evaluations/edit', id]);
  }

  deleteEvaluation(id: string): void {
    if (confirm('Voulez-vous supprimer cette évaluation ?')) {
      this.performanceService.deleteEvaluation(id).subscribe({
        next: () => {
          this.snackBar.open('Évaluation supprimée avec succès', 'Fermer', { duration: 3000 });
          this.loadEvaluations();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  createEvaluation(): void {
    this.router.navigate(['/app/performance/evaluations/create']);
  }

  // Méthodes utilitaires
  getPeriodeLabel(periode: string): string {
    return PeriodeEvaluationLabels[periode as keyof typeof PeriodeEvaluationLabels] || periode;
  }

  getMentionLabel(mention: string | undefined): string {
    if (!mention) return 'Non défini';
    return MentionPerformanceLabels[mention as keyof typeof MentionPerformanceLabels] || mention;
  }

  getMentionColor(mention: string | undefined): string {
    if (!mention) return 'secondary';
    
    const colors: Record<string, string> = {
      'EXCEPTIONNEL': 'exceptionnel',
      'TRES_BIEN': 'tres_bien',
      'BIEN': 'bien',
      'ASSEZ_BIEN': 'assez_bien',
      'INSUFFISANT': 'insuffisant'
    };
    return colors[mention] || 'secondary';
  }

  getPourcentage(pourcentage?: number): string {
    return pourcentage != null ? pourcentage.toFixed(1) + '%' : 'N/A';
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getMoyenneGenerale(): string {
    if (this.dataSource.data.length === 0) return 'N/A';
    const sum = this.dataSource.data.reduce((acc, val) => acc + (val.pourcentage || 0), 0);
    return (sum / this.dataSource.data.length).toFixed(1) + '%';
  }

  getMeilleureMention(): string {
    if (this.dataSource.data.length === 0) return '—';
    const meilleur = this.dataSource.data.reduce((a, b) => 
      (a.pourcentage || 0) > (b.pourcentage || 0) ? a : b
    );
    return this.getMentionLabel(meilleur.mention);
  }
}