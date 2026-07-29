// src/app/features/rh/conges/signal-absence/signal-absence.component.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CongeService } from '../../../core/services/conge.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signal-absence',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="container mt-4">
      <div class="card">
        <div class="card-header">
          <h3>Signalement d'Absence</h3>
        </div>
        <div class="card-body">
          <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
          <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

          <form (ngSubmit)="submit()">
            <div class="mb-3">
              <label class="form-label">Motif de l'absence</label>
              <textarea class="form-control" [(ngModel)]="motif" name="motif" rows="3" required></textarea>
              <small class="form-text text-muted">Décrivez brièvement la raison de votre absence</small>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Date de début</label>
                <input type="date" class="form-control" [(ngModel)]="dateDebut" name="dateDebut" [min]="today" required>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Date de fin</label>
                <input type="date" class="form-control" [(ngModel)]="dateFin" name="dateFin" [min]="dateDebut || today" required>
              </div>
            </div>

            <div class="d-flex justify-content-between">
              <button type="button" class="btn btn-secondary" (click)="goBack()">Annuler</button>
              <button type="submit" class="btn btn-warning" [disabled]="isSubmitting || !isFormValid()">
                {{ isSubmitting ? 'Envoi...' : 'Signaler l\'absence' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <h5>Informations importantes</h5>
        </div>
        <div class="card-body">
          <ul>
            <li>Cette absence est un simple signalement et ne nécessite pas de validation</li>
            <li>Elle ne consomme pas vos jours de congé annuel</li>
            <li>L'absence apparaîtra dans votre historique</li>
            <li>Votre manager sera notifié de votre absence</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: auto; }
  `]
})
export class SignalAbsenceComponent implements OnInit {
  motif: string = '';
  dateDebut: string = '';
  dateFin: string = '';
  today: string = new Date().toISOString().split('T')[0];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;

  constructor(
    private congeService: CongeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const matricule = this.authService.getCurrentEmployeeId();
    if (!matricule) {
      this.errorMessage = 'Utilisateur non identifié.';
    }
  }

  isFormValid(): boolean {
    return !!this.motif && !!this.dateDebut && !!this.dateFin;
  }

  submit(): void {
    if (this.isSubmitting || !this.isFormValid()) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    //  Le service utilise automatiquement le matricule
    this.congeService.signalAbsence({
      jourDebut: this.dateDebut,
      jourFin: this.dateFin,
      motif: this.motif
    }).subscribe({
      next: () => {
        this.successMessage = 'Absence signalée avec succès !';
        setTimeout(() => this.router.navigate(['/app/rh/conges']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.message || 'Erreur lors du signalement.';
        this.isSubmitting = false;
        setTimeout(() => this.errorMessage = null, 5000);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/app/rh/conges']);
  }
}