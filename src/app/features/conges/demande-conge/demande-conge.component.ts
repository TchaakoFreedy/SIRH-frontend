// src/app/features/rh/conges/demande-conge/demande-conge.component.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CongeService } from '../../../core/services/conge.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Conge, StatutConge, TypeConge } from '../../../core/models/conge.model';

@Component({
  selector: 'app-demande-conge',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './demande-conge.component.html',
  styleUrls: ['./demande-conge.component.css']
})
export class DemandeCongeComponent implements OnInit {
  conge: Conge = {
    typeConge: TypeConge.ANNUEL,
    nbJour: 0,
    jourDebut: '',
    jourFin: '',
    statut: StatutConge.EN_ATTENTE
  };

  soldeAnnuelRestant: number = 0;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;
  
  //  Liste des types disponibles (SANS MALADIE)
  typesConge = [
    { value: 'ANNUEL', label: 'Congé annuel' },
    { value: 'PERMISSION', label: 'Permission (max 3 jours)' },
    { value: 'ABSENCE', label: 'Signaler une absence' }
  ];
  
  today: string = new Date().toISOString().split('T')[0];
  
  matricule: string = '';
  hasCreatePermission = false;

  constructor(
    private congeService: CongeService,
    private authService: AuthService,
    private permissionService: PermissionService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.matricule = this.authService.getCurrentEmployeeId();
    console.log('📋 Matricule récupéré:', this.matricule);
    
    if (!this.matricule) {
      this.errorMessage = 'Utilisateur non identifié. Veuillez vous reconnecter.';
      return;
    }

    this.hasCreatePermission = this.permissionService.hasPermissionSync('LEAVE_CREATE');
    if (!this.hasCreatePermission) {
      this.errorMessage = 'Vous n\'avez pas la permission de créer une demande de congé.';
      setTimeout(() => this.errorMessage = null, 5000);
    }

    this.loadSolde();
  }

  loadSolde(): void {
    if (!this.matricule) {
      this.errorMessage = 'Utilisateur non identifié.';
      return;
    }

    this.congeService.getSoldeByEmployee(this.matricule).subscribe({
      next: (solde) => {
        this.soldeAnnuelRestant = solde;
        console.log('📊 Solde chargé:', solde);
      },
      error: (err) => {
        console.error('Erreur chargement solde:', err);
        this.errorMessage = 'Impossible de charger le solde des congés.';
        setTimeout(() => this.errorMessage = null, 5000);
      }
    });
  }

  calculerNbJours(): void {
    if (this.conge.jourDebut && this.conge.jourFin) {
      const start = new Date(this.conge.jourDebut);
      const end = new Date(this.conge.jourFin);
      
      if (end >= start) {
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        this.conge.nbJour = diff > 0 ? diff : 0;
      } else {
        this.conge.nbJour = 0;
        this.errorMessage = 'La date de fin doit être postérieure à la date de début.';
        setTimeout(() => this.errorMessage = null, 5000);
      }
    }
  }

  isFormValid(): boolean {
    if (!this.conge.jourDebut || !this.conge.jourFin) {
      return false;
    }

    if (this.conge.typeConge === TypeConge.ANNUEL && this.conge.nbJour > this.soldeAnnuelRestant) {
      return false;
    }

    if (this.conge.typeConge === TypeConge.PERMISSION && this.conge.nbJour > 3) {
      return false;
    }

    return true;
  }

  getValidationMessage(): string | null {
    if (!this.conge.jourDebut || !this.conge.jourFin) {
      return 'Veuillez sélectionner les dates de début et de fin.';
    }

    if (this.conge.typeConge === TypeConge.ANNUEL && this.conge.nbJour > this.soldeAnnuelRestant) {
      return `Solde insuffisant. Solde disponible : ${this.soldeAnnuelRestant} jours.`;
    }

    if (this.conge.typeConge === TypeConge.PERMISSION && this.conge.nbJour > 3) {
      return 'La permission ne peut pas dépasser 3 jours.';
    }

    return null;
  }

  getSubmitButtonLabel(): string {
    const labels: Record<string, string> = {
      'ANNUEL': 'Envoyer la demande de congé',
      'PERMISSION': 'Demander la permission',
      'ABSENCE': 'Signaler l\'absence',
    };
    return labels[this.conge.typeConge] || 'Envoyer la demande';
  }

  getSuccessMessage(): string {
    const messages: Record<string, string> = {
      'ANNUEL': ' Demande de congé envoyée avec succès !',
      'PERMISSION': ' Permission demandée avec succès !',
      'ABSENCE': ' Absence signalée avec succès !',
    };
    return messages[this.conge.typeConge] || 'Demande envoyée avec succès !';
  }

  save(): void {
    if (this.isSubmitting) return;
    
    if (!this.matricule) {
      this.errorMessage = 'Utilisateur non identifié. Veuillez vous reconnecter.';
      setTimeout(() => this.errorMessage = null, 5000);
      return;
    }

    if (!this.hasCreatePermission) {
      this.errorMessage = 'Vous n\'avez pas la permission de créer une demande.';
      setTimeout(() => this.errorMessage = null, 5000);
      return;
    }

    if (!this.conge.jourDebut || !this.conge.jourFin) {
      this.errorMessage = 'Veuillez sélectionner les dates de début et de fin.';
      setTimeout(() => this.errorMessage = null, 5000);
      return;
    }

    const validationMessage = this.getValidationMessage();
    if (validationMessage) {
      this.errorMessage = validationMessage;
      setTimeout(() => this.errorMessage = null, 5000);
      return;
    }

    this.errorMessage = null;
    this.isSubmitting = true;

    this.congeService.create(this.conge).subscribe({
      next: (response) => {
        console.log(' Demande créée avec succès:', response);
        this.successMessage = this.getSuccessMessage();
        setTimeout(() => {
          this.router.navigate(['/app/rh/conges']);
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Erreur lors de la création:', err);
        this.errorMessage = err.message || 'Erreur lors de la soumission de la demande.';
        this.isSubmitting = false;
        this.successMessage = null;
        setTimeout(() => this.errorMessage = null, 5000);
      }
    });
  }

  goToConges(): void {
    this.router.navigate(['/app/rh/conges']);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'ANNUEL': '📅',
      'PERMISSION': '🔑',
      'ABSENCE': '⚠️'
    };
    return icons[type] || '';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ANNUEL': 'Congé annuel',
      'PERMISSION': 'Permission',
      'ABSENCE': 'Absence signalée'
    };
    return labels[type] || type;
  }
}