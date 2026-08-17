// src/app/features/discipline/components/demande-explication/demande-explication-import/demande-explication-import.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';

import { ImportDisciplineService, ImportResult } from '../../../services/import-discipline.service';
import { EmployeService } from '../../../../../core/services/employe.service';
import { Employee } from '../../../../../core/models/employee.model';

// Interface pour les utilisateurs simplifiés
interface SimpleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

@Component({
  selector: 'app-demande-explication-import',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDividerModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './demande-explication-import.component.html',
  styleUrls: ['./demande-explication-import.component.scss']
})
export class DemandeExplicationImportComponent implements OnInit {
  importForm: FormGroup;
  employees: Employee[] = [];
  users: SimpleUser[] = [];
  isLoading = false;
  isSubmitting = false;
  importResults: ImportResult[] = [];
  showResults = false;
  selectedFile: File | null = null;

  statuts = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'REPONDUE', label: 'Répondue' },
    { value: 'VALIDE', label: 'Validée' },
    { value: 'REJETEE', label: 'Rejetée' },
    { value: 'ANNULEE', label: 'Annulée' }
  ];

  actions = [
    { value: 'DEMANDE_CREEE', label: 'Demande créée' },
    { value: 'DEMANDE_MODIFIEE', label: 'Demande modifiée' },
    { value: 'EMPLOYE_A_REPONDU', label: 'Employé a répondu' },
    { value: 'REPONSE_VALIDEE', label: 'Réponse validée' },
    { value: 'REPONSE_REJETEE', label: 'Réponse rejetée' }
  ];

  constructor(
    private fb: FormBuilder,
    private importService: ImportDisciplineService,
    private employeService: EmployeService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.importForm = this.fb.group({
      numeroOriginal: ['', Validators.required],
      objet: ['', Validators.required],
      description: [''],
      motif: ['', Validators.required],
      employeConcerneIdentifier: ['', Validators.required],
      auteurIdentifier: [''],
      dateCreation: [''],
      dateLimiteReponse: [''],
      statut: ['EN_ATTENTE'],
      hasReponse: [false],
      reponse: this.fb.group({
        contenu: [''],
        piecesJointes: [[]],
        dateReponse: [''],
        validee: [false],
        rejetee: [false]
      }),
      hasHistorique: [false],
      historique: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  get historiqueArray(): FormArray {
    return this.importForm.get('historique') as FormArray;
  }

  /**
   * Helper pour obtenir un FormGroup à partir d'un AbstractControl
   * Utilisé dans le template pour l'historique
   */
  getHistoriqueFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.employeService.getAll().subscribe({
      next: (employees) => {
        this.employees = employees;
        
        // Créer la liste des utilisateurs simplifiés à partir des employés
        this.users = employees
          .filter(emp => emp.userId)
          .map(emp => ({
            id: emp.userId || '',
            firstName: emp.prenom || '',
            lastName: emp.nom || '',
            email: emp.email || '',
            fullName: `${emp.prenom || ''} ${emp.nom || ''}`.trim()
          }));
        
        // Ajouter les employés sans userId
        employees
          .filter(emp => !emp.userId)
          .forEach(emp => {
            this.users.push({
              id: emp.id || '',
              firstName: emp.prenom || '',
              lastName: emp.nom || '',
              email: emp.email || '',
              fullName: `${emp.prenom || ''} ${emp.nom || ''}`.trim()
            });
          });
        
        this.isLoading = false;
        console.log('✅ Employés chargés:', employees.length);
        console.log('✅ Utilisateurs générés:', this.users.length);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur lors du chargement des employés:', error);
        this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', { duration: 3000 });
      }
    });
  }

  getEmployeeDisplay(emp: Employee): string {
    const prenom = emp.prenom || '';
    const nom = emp.nom || '';
    const nomComplet = `${prenom} ${nom}`.trim();
    const matricule = emp.matriculeInterne ? ` (${emp.matriculeInterne})` : '';
    const email = emp.email ? ` - ${emp.email}` : '';
    return nomComplet || emp.matriculeInterne || emp.email || 'Employé sans nom';
  }

  getUserDisplay(user: SimpleUser): string {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || user.id || 'Utilisateur';
  }

  addHistorique(): void {
    const historiqueGroup = this.fb.group({
      action: ['DEMANDE_CREEE', Validators.required],
      date: [''],
      commentaire: ['']
    });
    this.historiqueArray.push(historiqueGroup);
  }

  removeHistorique(index: number): void {
    this.historiqueArray.removeAt(index);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.snackBar.open(`Fichier sélectionné: ${this.selectedFile.name}`, 'Fermer', { duration: 3000 });
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Veuillez sélectionner un fichier', 'Fermer', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.importService.importerDepuisCSV(this.selectedFile).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.snackBar.open(response.message, 'Fermer', { duration: 3000 });
          this.selectedFile = null;
          const fileInput = document.getElementById('fileInput') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          this.snackBar.open(response.message || 'Erreur lors de l\'import', 'Fermer', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Erreur:', error);
        this.snackBar.open('Erreur lors de l\'import du fichier', 'Fermer', { duration: 5000 });
      }
    });
  }

  onSubmit(): void {
    if (this.importForm.invalid) {
      Object.keys(this.importForm.controls).forEach(key => {
        this.importForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.importForm.value;

    // 🔧 Construction des données avec formatage des dates
    const importData: any = {
      numeroOriginal: formValue.numeroOriginal,
      objet: formValue.objet,
      description: formValue.description,
      motif: formValue.motif,
      employeConcerneIdentifier: formValue.employeConcerneIdentifier,
      auteurIdentifier: formValue.auteurIdentifier,
      statut: formValue.statut
    };

    // 🔧 Formater dateCreation
    if (formValue.dateCreation) {
      const date = new Date(formValue.dateCreation);
      if (!isNaN(date.getTime())) {
        importData.dateCreation = this.formatDateToISO(date);
      }
    }

    // 🔧 Formater dateLimiteReponse
    if (formValue.dateLimiteReponse) {
      const date = new Date(formValue.dateLimiteReponse);
      if (!isNaN(date.getTime())) {
        // Ajouter 23:59:59 pour la date limite
        date.setHours(23, 59, 59, 999);
        importData.dateLimiteReponse = this.formatDateToISO(date);
      }
    }

    // 🔧 Formater la réponse
    if (formValue.hasReponse && formValue.reponse) {
      importData.reponse = {
        contenu: formValue.reponse.contenu,
        piecesJointes: formValue.reponse.piecesJointes || [],
        validee: formValue.reponse.validee || false,
        rejetee: formValue.reponse.rejetee || false
      };
      
      if (formValue.reponse.dateReponse) {
        const date = new Date(formValue.reponse.dateReponse);
        if (!isNaN(date.getTime())) {
          importData.reponse.dateReponse = this.formatDateToISO(date);
        }
      }
    }

    // 🔧 Formater l'historique
    if (formValue.hasHistorique && formValue.historique && formValue.historique.length > 0) {
      importData.historique = formValue.historique.map((h: any) => {
        const histoItem: any = {
          action: h.action,
          commentaire: h.commentaire
        };
        
        if (h.date) {
          const date = new Date(h.date);
          if (!isNaN(date.getTime())) {
            histoItem.date = this.formatDateToISO(date);
          }
        }
        
        return histoItem;
      });
    }

    console.log('📤 Données envoyées:', JSON.stringify(importData, null, 2));

    this.importService.importerDemande(importData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.snackBar.open(`✅ ${response.message}`, 'Fermer', { duration: 3000 });
          this.importForm.reset();
          this.importForm.patchValue({ statut: 'EN_ATTENTE' });
          while (this.historiqueArray.length) {
            this.historiqueArray.removeAt(0);
          }
        } else {
          this.snackBar.open(`❌ ${response.message}`, 'Fermer', { duration: 5000 });
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Erreur:', error);
        let errorMessage = 'Erreur lors de l\'import';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.errors) {
          errorMessage = Object.values(error.error.errors).join(', ');
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
      }
    });
  }

  /**
   * Formate une date en format ISO avec timezone local
   */
  private formatDateToISO(date: Date): string {
    // Ajuster pour le fuseau horaire local
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - offset * 60000);
    return adjustedDate.toISOString().slice(0, 19); // Format: YYYY-MM-DDTHH:mm:ss
  }

  /**
   * Méthode alternative: formater en utilisant les méthodes natives
   */
  private formatDateToISOAlternative(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  onSubmitMass(): void {
    this.snackBar.open('Utilisez l\'onglet "Import CSV" pour les imports en masse', 'Fermer', { duration: 3000 });
  }

  goBack(): void {
    this.router.navigate(['/app/discipline/demandes']);
  }

  getSelectedEmployeeName(): string {
    const value = this.importForm.get('employeConcerneIdentifier')?.value;
    if (!value) return 'Non sélectionné';
    
    const emp = this.employees.find(e => 
      e.id === value || 
      e.email === value || 
      e.matriculeInterne === value ||
      e.userId === value
    );
    
    return emp ? this.getEmployeeDisplay(emp) : value;
  }

  getSelectedAuthorName(): string {
    const value = this.importForm.get('auteurIdentifier')?.value;
    if (!value) return 'Utilisateur RH par défaut';
    
    const user = this.users.find(u => 
      u.id === value || 
      u.email === value
    );
    
    return user ? this.getUserDisplay(user) : value;
  }

  downloadTemplate(): void {
    const headers = [
      'numeroOriginal',
      'objet',
      'description',
      'motif',
      'employeConcerneIdentifier',
      'auteurIdentifier',
      'dateCreation',
      'dateLimiteReponse',
      'statut'
    ];
    
    const exampleRow = [
      'EXP-2025-0001',
      'Retard répété',
      'L\'employé a accumulé 15 retards en 3 mois',
      'Non-respect des horaires de travail',
      'john.doe@company.com',
      'hr.manager@company.com',
      '2025-03-15T10:00:00',
      '2025-03-30T23:59:59',
      'EN_ATTENTE'
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'template_import_demandes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getSuccessCount(): number {
    return this.importResults.filter(r => r.success).length;
  }

  getDuplicateCount(): number {
    return this.importResults.filter(r => r.duplicate).length;
  }

  getFailureCount(): number {
    return this.importResults.filter(r => !r.success && !r.duplicate).length;
  }

  getStatusLabel(result: ImportResult): string {
    if (result.success) return 'Succès';
    if (result.duplicate) return 'Doublon';
    return 'Échec';
  }

  get f() {
    return this.importForm.controls;
  }

  get reponseControls() {
    return (this.importForm.get('reponse') as FormGroup).controls;
  }
}