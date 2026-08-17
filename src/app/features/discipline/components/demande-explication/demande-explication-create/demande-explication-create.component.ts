// src/app/features/discipline/components/demande-explication/demande-explication-create/demande-explication-create.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DisciplineService } from '../../../services/discipline.service';
import { EmployeService } from '../../../../../core/services/employe.service';
import { Employee } from '../../../../../core/models/employee.model';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-demande-explication-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './demande-explication-create.component.html',
  styleUrls: ['./demande-explication-create.component.scss']
})
export class DemandeExplicationCreateComponent implements OnInit {
  demandeForm: FormGroup;
  employees: Employee[] = [];
  isLoading = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private disciplineService: DisciplineService,
    private employeService: EmployeService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.demandeForm = this.fb.group({
      objet: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.required],
      motif: ['', Validators.required],
      employeConcerneId: ['', Validators.required],
      dateLimiteReponse: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.employeService.getAll().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur lors du chargement des employés:', error);
        if (error.status === 401) {
          this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', { duration: 3000 });
        }
      }
    });
  }

  getEmployeeDisplay(emp: Employee): string {
    const prenom = emp.prenom || '';
    const nom = emp.nom || '';
    const nomComplet = `${prenom} ${nom}`.trim();
    return nomComplet || emp.matriculeInterne || emp.matricule_CNPS || 'Employé sans nom';
  }

  getSelectedEmployeeName(): string {
    const id = this.demandeForm.get('employeConcerneId')?.value;
    if (!id) return 'Non sélectionné';
    const emp = this.employees.find(e => e.id === id);
    return emp ? this.getEmployeeDisplay(emp) : 'Non sélectionné';
  }

  onSubmit(): void {
    if (this.demandeForm.invalid) {
      Object.keys(this.demandeForm.controls).forEach(key => {
        this.demandeForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const formValue = this.demandeForm.value;

    if (formValue.dateLimiteReponse) {
      const date = new Date(formValue.dateLimiteReponse);
      date.setHours(23, 59, 59, 999);
      formValue.dateLimiteReponse = date.toISOString();
    }

    this.disciplineService.createDemande(formValue).subscribe({
      next: (demande) => {
        console.log('✅ Demande créée avec succès:', demande);
        this.submitting = false;
        this.snackBar.open('Demande créée avec succès !', 'Fermer', { duration: 3000 });
        
        // ✅ REDIRECTION CORRIGÉE : Rediriger vers la liste avec un délai
        // pour s'assurer que tout est bien enregistré
        setTimeout(() => {
          this.router.navigate(['/app/discipline/demandes']);
        }, 500);
      },
      error: (error) => {
        console.error('❌ Erreur:', error);
        this.submitting = false;
        
        let errorMessage = 'Erreur lors de la création';
        
        // ✅ Gestion des erreurs sans déconnexion
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          // Ne pas déconnecter automatiquement, juste afficher un message
          // this.authService.logout(); // ← NE PAS FAIRE CELA
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission de créer une demande.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Données invalides. Vérifiez les champs.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer.';
        }
        
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/app/discipline/demandes']);
  }

  get f() {
    return this.demandeForm.controls;
  }
}