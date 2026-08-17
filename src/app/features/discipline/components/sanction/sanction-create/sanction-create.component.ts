// src/app/features/discipline/components/sanction/sanction-create/sanction-create.component.ts

import { Component, OnInit } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SanctionService } from '../../../services/sanction.service';
import { DisciplineService } from '../../../services/discipline.service';
import { TypeSanction, TypeSanctionLabels, StatutSanction, StatutSanctionLabels } from '../../../models/sanction.model';
import { EmployeService } from '../../../../../core/services/employe.service';
import { Employee } from '../../../../../core/models/employee.model';

@Component({
  selector: 'app-sanction-create',
  standalone: true, // ✅ Rendre le composant standalone
  templateUrl: './sanction-create.component.html',
  styleUrls: ['./sanction-create.component.scss'],
  imports: [
    CommonModule,          // ✅ Pour @for, @if, etc.
    ReactiveFormsModule,   // ✅ Pour formGroup, formControlName
    RouterModule,          // ✅ Pour routerLink
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ]
})
export class SanctionCreateComponent implements OnInit {
  sanctionForm: FormGroup;
  typeOptions = Object.values(TypeSanction);
  statutOptions = Object.values(StatutSanction);
  employees: Employee[] = [];
  demandes: any[] = [];
  isLoading = false;
  submitting = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private sanctionService: SanctionService,
    private disciplineService: DisciplineService,
    private employeService: EmployeService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.sanctionForm = this.fb.group({
      employeId: ['', Validators.required],
      type: ['', Validators.required],
      motif: ['', [Validators.required, Validators.minLength(10)]],
      description: [''],
      dateDebut: ['', Validators.required],
      dateFin: [''],
      statut: ['ACTIVE', Validators.required],
      demandeExplicationId: ['']
    });
  }

  ngOnInit(): void {
    console.log('🟢 ngOnInit appelé');
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    console.log('🟡 Chargement des employés...');
    
    this.employeService.getAll().subscribe({
      next: (response: any) => {
        console.log('🔵 Réponse brute de l\'API:', response);
        console.log('🔵 Type de réponse:', typeof response);
        console.log('🔵 Est-ce un tableau?', Array.isArray(response));
        
        let employeesData: Employee[] = [];
        
        if (response) {
          if (Array.isArray(response)) {
            employeesData = response;
            console.log('📋 Cas 1: Tableau direct, nombre:', employeesData.length);
          }
          else if (response.content && Array.isArray(response.content)) {
            employeesData = response.content;
            console.log('📋 Cas 2: Paginé avec content, nombre:', employeesData.length);
          }
          else if (response.data && Array.isArray(response.data)) {
            employeesData = response.data;
            console.log('📋 Cas 3: Avec data, nombre:', employeesData.length);
          }
          else if (response.items && Array.isArray(response.items)) {
            employeesData = response.items;
            console.log('📋 Cas 4: Avec items, nombre:', employeesData.length);
          }
          else if (response.results && Array.isArray(response.results)) {
            employeesData = response.results;
            console.log('📋 Cas 5: Avec results, nombre:', employeesData.length);
          }
          else {
            console.warn('⚠️ Format non reconnu. Clés disponibles:', Object.keys(response));
            if (typeof response === 'object') {
              const keys = Object.keys(response);
              if (keys.length > 0 && !isNaN(Number(keys[0]))) {
                employeesData = Object.values(response) as Employee[];
                console.log('📋 Cas 6: Objet converti en tableau, nombre:', employeesData.length);
              }
            }
          }
        }
        
        this.employees = employeesData;
        console.log('✅ Employés finaux:', this.employees);
        console.log('✅ Nombre d\'employés:', this.employees.length);
        
        if (this.employees.length > 0) {
          console.log('📝 Premier employé:', this.employees[0]);
          console.log('📝 Nom affiché:', this.getEmployeeDisplay(this.employees[0]));
        } else {
          console.warn('⚠️ Aucun employé chargé !');
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Erreur lors du chargement des employés';
        console.error('❌ Erreur API:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        console.error('❌ Response:', error.error);
        this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', { duration: 3000 });
      }
    });
  }

  onEmployeeChange(): void {
    const employeeId = this.sanctionForm.get('employeId')?.value;
    console.log('🔄 Employé sélectionné:', employeeId);
    
    if (employeeId) {
      this.disciplineService.getDemandes({ employeId: employeeId }).subscribe({
        next: (page) => {
          console.log('📋 Demandes chargées:', page);
          this.demandes = page.content || [];
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des demandes:', error);
          this.demandes = [];
        }
      });
    } else {
      this.demandes = [];
    }
  }

  onSubmit(): void {
    if (this.sanctionForm.invalid) {
      Object.keys(this.sanctionForm.controls).forEach(key => {
        this.sanctionForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const formValue = this.sanctionForm.value;

    if (formValue.dateDebut) {
      const date = new Date(formValue.dateDebut);
      date.setHours(0, 0, 0, 0);
      formValue.dateDebut = date.toISOString();
    }
    if (formValue.dateFin) {
      const date = new Date(formValue.dateFin);
      date.setHours(23, 59, 59, 999);
      formValue.dateFin = date.toISOString();
    }

    this.sanctionService.createSanction(formValue).subscribe({
      next: (sanction) => {
        this.snackBar.open('✅ Sanction créée avec succès !', 'Fermer', { duration: 3000 });
        this.router.navigate(['/app/discipline/sanctions']);
      },
      error: (error) => {
        this.submitting = false;
        console.error('Erreur:', error);
        let errorMessage = 'Erreur lors de la création';
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/app/discipline/sanctions']);
  }

  getTypeLabel(type: TypeSanction): string {
    return TypeSanctionLabels[type] || type;
  }

  getStatutLabel(statut: StatutSanction): string {
    return StatutSanctionLabels[statut] || statut;
  }

  getEmployeeDisplay(emp: Employee): string {
    console.log('🔍 getEmployeeDisplay appelé avec:', emp);
    const prenom = emp?.prenom || '';
    const nom = emp?.nom || '';
    const nomComplet = `${prenom} ${nom}`.trim();
    if (nomComplet) {
      return nomComplet;
    }
    return emp?.matriculeInterne || emp?.matricule_CNPS || 'Employé sans nom';
  }
}