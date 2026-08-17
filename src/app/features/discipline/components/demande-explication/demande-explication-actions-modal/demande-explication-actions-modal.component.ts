// src/app/features/discipline/components/demande-explication/demande-explication-actions-modal/demande-explication-actions-modal.component.ts
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DisciplineService } from '../../../services/discipline.service';
import { DemandeExplication, StatutDemandeExplication } from '../../../models/demande-explication.model';

export interface DialogData {
  demande: DemandeExplication;
  action: 'view' | 'edit' | 'delete';
}

@Component({
  selector: 'app-demande-explication-actions-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  providers: [DatePipe],
  templateUrl: './demande-explication-actions-modal.component.html',
  styleUrls: ['./demande-explication-actions-modal.component.scss']
})
export class DemandeExplicationActionsModalComponent implements OnInit {
  @ViewChild('editForm') editForm!: NgForm;
  
  demande!: DemandeExplication;
  isLoading = false;
  isEditMode = false;

  constructor(
    public dialogRef: MatDialogRef<DemandeExplicationActionsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private disciplineService: DisciplineService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private router: Router
  ) {
    this.demande = { ...data.demande };
    this.isEditMode = data.action === 'edit';
  }

  ngOnInit(): void {
    if (this.data.action === 'view') {
      this.loadFullDetails();
    }
  }

  loadFullDetails(): void {
    if (this.demande.id) {
      this.disciplineService.getDemandeById(this.demande.id).subscribe({
        next: (data) => {
          this.demande = data;
        },
        error: (error) => {
          console.error('Erreur de chargement:', error);
          if (error.status === 401) {
            this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
          } else {
            this.snackBar.open('Erreur lors du chargement des détails', 'Fermer', { duration: 3000 });
          }
        }
      });
    }
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

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
  }

  formatDateShort(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
  }

  saveEdit(): void {
    if (!this.demande.id) return;

    // Vérifier si le formulaire est valide
    if (this.editForm && this.editForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    // Validation manuelle
    if (!this.demande.objet || !this.demande.motif || !this.demande.description) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const data = {
      objet: this.demande.objet,
      motif: this.demande.motif,
      description: this.demande.description,
      dateLimiteReponse: this.demande.dateLimiteReponse
    };

    this.disciplineService.updateDemande(this.demande.id, data).subscribe({
      next: (updated) => {
        this.isLoading = false;
        this.snackBar.open('Demande modifiée avec succès !', 'Fermer', { duration: 3000 });
        this.dialogRef.close({ action: 'edit', data: updated });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur:', error);
        let errorMessage = 'Erreur lors de la modification';
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 3000 });
      }
    });
  }

  confirmDelete(): void {
    if (!this.demande.id) return;

    this.isLoading = true;
    this.disciplineService.cancelDemande(this.demande.id).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Demande annulée avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close({ action: 'delete', id: this.demande.id });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur:', error);
        let errorMessage = 'Erreur lors de la suppression';
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 3000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
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
    this.dialogRef.close({ action: 'reply', id: this.demande.id });
  }

  validateResponse(): void {
    if (!this.demande.id) return;
    this.isLoading = true;
    this.disciplineService.validateResponse(this.demande.id).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Réponse validée avec succès !', 'Fermer', { duration: 3000 });
        this.loadFullDetails();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur:', error);
        let errorMessage = 'Erreur lors de la validation';
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 3000 });
      }
    });
  }

  rejectResponse(): void {
    if (!this.demande.id) return;
    this.isLoading = true;
    this.disciplineService.rejectResponse(this.demande.id).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Réponse rejetée', 'Fermer', { duration: 3000 });
        this.loadFullDetails();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur:', error);
        let errorMessage = 'Erreur lors du rejet';
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 3000 });
      }
    });
  }
}