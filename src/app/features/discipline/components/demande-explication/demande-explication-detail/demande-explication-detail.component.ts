import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DisciplineService } from '../../../services/discipline.service';
import { SanctionService } from '../../../services/sanction.service';
import { DemandeExplication, StatutDemandeExplication } from '../../../models/demande-explication.model';
import { TypeSanction } from '../../../models/sanction.model';

@Component({
  selector: 'app-demande-explication-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  providers: [DatePipe],
  templateUrl: './demande-explication-detail.component.html',
  styleUrls: ['./demande-explication-detail.component.scss']
})
export class DemandeExplicationDetailComponent implements OnInit {
  demande!: DemandeExplication;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private disciplineService: DisciplineService,
    private sanctionService: SanctionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDemande(id);
    }
  }

  loadDemande(id: string): void {
    this.isLoading = true;
    this.disciplineService.getDemandeById(id).subscribe({
      next: (data) => {
        this.demande = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement de la demande', 'Fermer', { duration: 3000 });
      }
    });
  }

  getStatutLabel(statut: StatutDemandeExplication): string {
    return this.disciplineService.getStatutLabel(statut);
  }

  getStatutColor(statut: StatutDemandeExplication): string {
    return this.disciplineService.getStatutColor(statut);
  }

  canReply(): boolean {
    return this.disciplineService.canReply(this.demande.statut);
  }

  canValidate(): boolean {
    return this.disciplineService.canValidate(this.demande.statut);
  }

  canReject(): boolean {
    return this.disciplineService.canReject(this.demande.statut);
  }

  goToReply(): void {
    this.router.navigate(['/discipline/demandes', this.demande.id, 'reply']);
  }

  validateResponse(): void {
    if (confirm('Voulez-vous valider cette réponse ?')) {
      this.isLoading = true;
      this.disciplineService.validateResponse(this.demande.id!).subscribe({
        next: () => {
          this.snackBar.open('Réponse validée avec succès !', 'Fermer', { duration: 3000 });
          this.loadDemande(this.demande.id!);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Erreur lors de la validation', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  rejectResponse(): void {
    if (confirm('Voulez-vous rejeter cette réponse ?')) {
      this.isLoading = true;
      this.disciplineService.rejectResponse(this.demande.id!).subscribe({
        next: () => {
          this.snackBar.open('Réponse rejetée', 'Fermer', { duration: 3000 });
          this.loadDemande(this.demande.id!);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Erreur lors du rejet', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  cancelDemande(): void {
    if (confirm('Voulez-vous annuler cette demande ?')) {
      this.isLoading = true;
      this.disciplineService.cancelDemande(this.demande.id!).subscribe({
        next: () => {
          this.snackBar.open('Demande annulée', 'Fermer', { duration: 3000 });
          this.loadDemande(this.demande.id!);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Erreur lors de l\'annulation', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/discipline/demandes']);
  }
}