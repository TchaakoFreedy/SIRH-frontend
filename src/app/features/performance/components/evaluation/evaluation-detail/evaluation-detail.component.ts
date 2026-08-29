import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerformanceService } from '../../../services/performance.service';
import { EvaluationPerformance, MentionPerformanceLabels, MentionPerformanceColors } from '../../../models/evaluation-performance.model';
import { PeriodeEvaluationLabels } from '../../../models/periode-evaluation.enum';

@Component({
  selector: 'app-evaluation-detail',
  standalone: false,
  templateUrl: './evaluation-detail.component.html',
  styleUrls: ['./evaluation-detail.component.scss']
})
export class EvaluationDetailComponent implements OnInit {
  evaluation: EvaluationPerformance | null = null;
  isLoading = false;
  isDeleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private performanceService: PerformanceService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEvaluation(id);
    } else {
      this.snackBar.open('ID d\'évaluation non trouvé', 'Fermer', { duration: 3000 });
      this.goBack();
    }
  }

  loadEvaluation(id: string): void {
    this.isLoading = true;
    this.performanceService.getEvaluationById(id).subscribe({
      next: (data) => {
        this.evaluation = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Erreur lors du chargement de l\'évaluation', 'Fermer', { duration: 3000 });
        this.goBack();
      }
    });
  }

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

  deleteEvaluation(): void {
    if (confirm('Voulez-vous supprimer cette évaluation ? Cette action est irréversible.')) {
      this.isDeleting = true;
      this.performanceService.deleteEvaluation(this.evaluation!.id!).subscribe({
        next: () => {
          this.snackBar.open('Évaluation supprimée avec succès', 'Fermer', { duration: 3000 });
          this.router.navigate(['/app/performance/evaluations']);
        },
        error: () => {
          this.isDeleting = false;
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/app/performance/evaluations']);
  }

  editEvaluation(): void {
    if (this.evaluation && this.evaluation.id) {
      this.router.navigate(['/app/performance/evaluations/edit', this.evaluation.id]);
    }
  }
}