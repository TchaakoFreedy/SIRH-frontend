import { Component, Inject, HostListener } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EvaluationPerformance } from '../../models/evaluation-performance.model';
import { PerformanceService } from '../../services/performance.service';

export interface DialogData {
  evaluationId: string;
  allEvaluations: EvaluationPerformance[];
}

@Component({
  selector: 'app-evaluation-detail-dialog',
  standalone: false,
  templateUrl: './evaluation-detail-dialog.component.html',
  styleUrls: ['./evaluation-detail-dialog.component.scss']
})
export class EvaluationDetailDialogComponent {
  evaluation: EvaluationPerformance | null = null;
  currentIndex: number = -1;
  loading = false;

  mentionLabels: Record<string, string> = {
    EXCEPTIONNEL: 'Exceptionnel',
    TRES_BIEN: 'Très Bien',
    BIEN: 'Bien',
    ASSEZ_BIEN: 'Assez Bien',
    INSUFFISANT: 'Insuffisant'
  };

  constructor(
    public dialogRef: MatDialogRef<EvaluationDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private performanceService: PerformanceService
  ) {
    this.currentIndex = data.allEvaluations.findIndex(e => e.id === data.evaluationId);
    if (this.currentIndex !== -1) {
      this.evaluation = data.allEvaluations[this.currentIndex];
    } else {
      this.loadEvaluation(data.evaluationId);
    }
  }

  private loadEvaluation(id: string): void {
    this.loading = true;
    this.performanceService.getEvaluationById(id).subscribe({
      next: (ev) => {
        this.evaluation = ev;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.evaluation = null;
      }
    });
  }

  goToPrevious(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.evaluation = this.data.allEvaluations[this.currentIndex];
    }
  }

  goToNext(): void {
    if (this.currentIndex < this.data.allEvaluations.length - 1) {
      this.currentIndex++;
      this.evaluation = this.data.allEvaluations[this.currentIndex];
    }
  }

  hasPrevious(): boolean {
    return this.currentIndex > 0;
  }

  hasNext(): boolean {
    return this.currentIndex < this.data.allEvaluations.length - 1;
  }

  getMentionLabel(mention: string): string {
    return this.mentionLabels[mention] || mention;
  }

  getMentionClass(mention: string): string {
    const classes: Record<string, string> = {
      EXCEPTIONNEL: 'exceptionnel',
      TRES_BIEN: 'tres_bien',
      BIEN: 'bien',
      ASSEZ_BIEN: 'assez_bien',
      INSUFFISANT: 'insuffisant'
    };
    return classes[mention] || 'secondary';
  }

  close(): void {
    this.dialogRef.close();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' && this.hasPrevious()) {
      this.goToPrevious();
    } else if (event.key === 'ArrowRight' && this.hasNext()) {
      this.goToNext();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }
}