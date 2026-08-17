import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '../../../../services/auth.service';
import { EvaluationPerformance } from '../../models/evaluation-performance.model';
import { Page } from '../../../../shared/models/page.model';
import { ClassementDTO } from '../../models/classement.model';
import { EvaluationDetailDialogComponent } from './evaluation-detail-dialog.component';

@Component({
  selector: 'app-my-performance',
  standalone: false,
  templateUrl: './my-performance.component.html',
  styleUrls: ['./my-performance.component.scss']
})
export class MyPerformanceComponent implements OnInit {
  isLoading = false;
  isLoadingStats = false;
  
  evaluations: EvaluationPerformance[] = [];
  dataSource = new MatTableDataSource<EvaluationPerformance>();
  displayedColumns: string[] = ['periode', 'annee', 'pourcentage', 'mention', 'dateEvaluation', 'actions'];
  totalElements = 0;
  
  stats: any = null;
  myRank: ClassementDTO | null = null;
  currentYear = new Date().getFullYear();
  
  mentionColors: Record<string, string> = {
    'EXCEPTIONNEL': '#10b981',
    'TRES_BIEN': '#3b82f6',
    'BIEN': '#8b5cf6',
    'ASSEZ_BIEN': '#f59e0b',
    'INSUFFISANT': '#ef4444'
  };

  mentionLabels: Record<string, string> = {
    'EXCEPTIONNEL': 'Exceptionnel',
    'TRES_BIEN': 'Très Bien',
    'BIEN': 'Bien',
    'ASSEZ_BIEN': 'Assez Bien',
    'INSUFFISANT': 'Insuffisant'
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['/app/performance']);
  }

  loadData(): void {
    this.isLoading = true;
    this.isLoadingStats = true;
    
    this.performanceService.getMyEvaluations({ size: 100 }).subscribe({
      next: (page: Page<EvaluationPerformance>) => {
        this.evaluations = page.content;
        this.totalElements = page.totalElements;
        this.dataSource.data = this.evaluations;
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Evaluations chargees:', this.evaluations.length);
      },
      error: (error) => {
        console.error('Erreur chargement evaluations:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Erreur lors du chargement de vos evaluations', 'Fermer', { duration: 3000 });
      }
    });

    this.performanceService.getMyPerformanceStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoadingStats = false;
        this.cdr.detectChanges();
        console.log('Statistiques chargees:', stats);
      },
      error: (error) => {
        console.error('Erreur chargement statistiques:', error);
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      }
    });

    this.performanceService.getMyRank(this.currentYear).subscribe({
      next: (rank) => {
        this.myRank = rank;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur chargement classement:', error);
      }
    });
  }

  getMentionColor(mention: string): string {
    return this.mentionColors[mention] || '#6b7280';
  }

  getMentionLabel(mention: string): string {
    return this.mentionLabels[mention] || mention;
  }

  getPourcentage(pourcentage?: number): string {
    return pourcentage != null ? pourcentage.toFixed(1) + '%' : 'N/A';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  viewEvaluation(id: string): void {
    this.dialog.open(EvaluationDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        evaluationId: id,
        allEvaluations: this.evaluations
      },
      autoFocus: false,
      panelClass: 'custom-dialog-container'
    });
  }

  getMentionClass(mention: string): string {
    const classes: Record<string, string> = {
      'EXCEPTIONNEL': 'exceptionnel',
      'TRES_BIEN': 'tres_bien',
      'BIEN': 'bien',
      'ASSEZ_BIEN': 'assez_bien',
      'INSUFFISANT': 'insuffisant'
    };
    return classes[mention] || 'secondary';
  }

  getTotalEmployes(): number {
    return this.myRank?.totalEmployes || 0;
  }
}