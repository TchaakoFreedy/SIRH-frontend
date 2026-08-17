// src/app/features/performance/components/critere/critere-create/critere-create.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PerformanceService } from '../../../services/performance.service';
import { EmployeService } from '../../../../../core/services/employe.service';
import { Employee } from '../../../../../core/models/employee.model';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-critere-create',
  standalone: false,
  templateUrl: './critere-create.component.html',
  styleUrls: ['./critere-create.component.scss']
})
export class CritereCreateComponent implements OnInit, OnDestroy {
  critereForm: FormGroup;
  submitting = false;
  criteresCount: number = 0;
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  private destroy$ = new Subject<void>();
  
  // Options
  typeOptions = [
    { value: 'GLOBAL', label: 'Global - Applicable à tous les employés' },
    { value: 'SELECTIVE', label: 'Sélectif - Applicable à des employés spécifiques' }
  ];

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private employeService: EmployeService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.critereForm = this.fb.group({
      nom: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      noteMaximale: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      coefficient: [1, [Validators.required, Validators.min(1)]],
      typeCritere: ['GLOBAL', Validators.required],
      employeeIds: [[]],
      ordreAffichage: [0]
    });
  }

  ngOnInit(): void {
    this.loadCriteresCount();
    this.loadEmployees();
    
    this.critereForm.get('typeCritere')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.updateEmployeeValidation(type);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCriteresCount(): void {
    this.performanceService.getActiveCriteres()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (criteres) => {
          this.criteresCount = criteres.length;
        },
        error: () => {
          this.criteresCount = 0;
        }
      });
  }

  loadEmployees(): void {
    this.employeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees: Employee[]) => {
          this.employees = employees;
          this.filteredEmployees = employees;
          console.log('✅ Employés chargés:', employees.length);
        },
        error: (error) => {
          console.error('❌ Erreur chargement employés:', error);
          if (error.status === 401) {
            this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
          } else {
            this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', { duration: 3000 });
          }
        }
      });
  }

  updateEmployeeValidation(type: string): void {
    const employeeIdsControl = this.critereForm.get('employeeIds');
    if (type === 'SELECTIVE') {
      employeeIdsControl?.setValidators([Validators.required, Validators.minLength(1)]);
    } else {
      employeeIdsControl?.clearValidators();
      employeeIdsControl?.setValue([]);
    }
    employeeIdsControl?.updateValueAndValidity();
  }

  filterEmployees(event: any): void {
    const value = event?.target?.value || '';
    const filterValue = value.toLowerCase();
    this.filteredEmployees = this.employees.filter(emp => {
      const fullName = `${emp.prenom || ''} ${emp.nom || ''}`.toLowerCase();
      const matricule = (emp.matriculeInterne || '').toLowerCase();
      return fullName.includes(filterValue) || matricule.includes(filterValue);
    });
  }

  onEmployeeSelect(event: any, employeeId: string | undefined): void {
    if (!employeeId) {
      console.warn('⚠️ employeeId est undefined, sélection ignorée');
      return;
    }

    const isChecked = event.target.checked;
    const currentIds = this.critereForm.get('employeeIds')?.value || [];
    
    if (isChecked) {
      if (!currentIds.includes(employeeId)) {
        this.critereForm.get('employeeIds')?.setValue([...currentIds, employeeId]);
      }
    } else {
      this.critereForm.get('employeeIds')?.setValue(currentIds.filter((id: string) => id !== employeeId));
    }
    
    this.critereForm.get('employeeIds')?.markAsTouched();
  }

  isEmployeeSelected(employeeId: string | undefined): boolean {
    if (!employeeId) return false;
    const currentIds = this.critereForm.get('employeeIds')?.value || [];
    return currentIds.includes(employeeId);
  }

  getEmployeeDisplay(emp: Employee): string {
    if (!emp) return 'Employé inconnu';
    
    const prenom = emp.prenom || '';
    const nom = emp.nom || '';
    const nomComplet = `${prenom} ${nom}`.trim();
    const matricule = emp.matriculeInterne || emp.matricule_CNPS || 'N/A';
    
    if (nomComplet) {
      return `${nomComplet} (${matricule})`;
    }
    return `Employé ${matricule}`;
  }

  getSafeEmployeeId(emp: Employee): string {
    return emp?.id || '';
  }

  onSubmit(): void {
    if (this.critereForm.invalid) {
      this.critereForm.markAllAsTouched();
      this.snackBar.open('Veuillez corriger les erreurs du formulaire', 'Fermer', { duration: 3000 });
      return;
    }

    const formValue = this.critereForm.value;
    
    if (formValue.typeCritere === 'SELECTIVE' && (!formValue.employeeIds || formValue.employeeIds.length === 0)) {
      this.snackBar.open('Veuillez sélectionner au moins un employé pour un critère sélectif', 'Fermer', { duration: 3000 });
      return;
    }

    this.submitting = true;
    
    this.performanceService.createCritere(formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (critere) => {
          console.log('✅ Critère créé avec succès:', critere);
          this.submitting = false;
          
          this.snackBar.open('✅ Critère créé avec succès !', 'Fermer', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // ✅ SOLUTION: Rester sur la page et réinitialiser le formulaire
          setTimeout(() => {
            // Sauvegarder le type actuel
            const currentType = this.critereForm.get('typeCritere')?.value;
            
            // Réinitialiser le formulaire
            this.critereForm.reset();
            this.critereForm.patchValue({
              typeCritere: currentType || 'GLOBAL',
              noteMaximale: 10,
              coefficient: 1,
              ordreAffichage: 0,
              employeeIds: []
            });
            
            // Mettre à jour la validation
            this.updateEmployeeValidation(currentType || 'GLOBAL');
            
            // Marquer le formulaire comme propre
            this.critereForm.markAsPristine();
            this.critereForm.markAsUntouched();
            
            // Recharger le compteur
            this.loadCriteresCount();
            
            this.snackBar.open('Formulaire réinitialisé, vous pouvez créer un autre critère', 'Fermer', { duration: 3000 });
          }, 500);
        },
        error: (error) => {
          this.submitting = false;
          console.error('❌ Erreur création critère:', error);
          
          let errorMessage = 'Erreur lors de la création';
          
          // ✅ Gestion des erreurs sans déconnexion
          if (error.status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          } else if (error.status === 403) {
            errorMessage = 'Vous n\'avez pas la permission de créer un critère.';
          } else if (error.status === 400) {
            errorMessage = 'Données invalides. Vérifiez les champs.';
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
          } else if (error.status === 500) {
            errorMessage = 'Erreur serveur. Veuillez réessayer.';
          } else if (error.status === 0) {
            errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/performance/criteres']);
  }

  get f() {
    return this.critereForm.controls;
  }
}