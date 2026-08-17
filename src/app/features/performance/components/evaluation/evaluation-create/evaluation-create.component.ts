// src/app/features/performance/components/evaluation/evaluation-create/evaluation-create.component.ts

import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { PerformanceService } from '../../../services/performance.service';
import { EmployeService } from '../../../../../core/services/employe.service';
import { AuthService } from '../../../../../services/auth.service';
import { CriterePerformance } from '../../../models/critere-performance.model';
import { PeriodeEvaluation, PeriodeEvaluationLabels } from '../../../models/periode-evaluation.enum';
import { Employee } from '../../../../../core/models/employee.model';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-evaluation-create',
  standalone: false,
  templateUrl: './evaluation-create.component.html',
  styleUrls: ['./evaluation-create.component.scss']
})
export class EvaluationCreateComponent implements OnInit, OnDestroy {
  evaluationForm: FormGroup;
  employees: Employee[] = [];
  allCriteres: CriterePerformance[] = [];
  availableCriteres: CriterePerformance[] = [];
  periodeOptions = Object.values(PeriodeEvaluation);
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  yearOptions: number[] = [];
  monthOptions: MonthOption[] = [];
  isLoading = false;
  submitting = false;
  errorMessage: string = '';
  showError: boolean = false;
  selectedEmployeeId: string = '';
  selectedCritereIds: Set<string> = new Set();
  showMonthSelector = false;
  isYearLoading = false;
  private destroy$ = new Subject<void>();

  private readonly PAST_YEARS = 10;
  private readonly FUTURE_YEARS = 5;

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private employeService: EmployeService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.evaluationForm = this.fb.group({
      employeId: [{ value: '', disabled: true }, Validators.required],
      periode: ['', Validators.required],
      annee: [this.currentYear, Validators.required],
      mois: [this.currentMonth],
      commentaires: [''],
      notes: this.fb.array([])
    });

    this.monthOptions = [
      { value: 1, label: 'Janvier' },
      { value: 2, label: 'Février' },
      { value: 3, label: 'Mars' },
      { value: 4, label: 'Avril' },
      { value: 5, label: 'Mai' },
      { value: 6, label: 'Juin' },
      { value: 7, label: 'Juillet' },
      { value: 8, label: 'Août' },
      { value: 9, label: 'Septembre' },
      { value: 10, label: 'Octobre' },
      { value: 11, label: 'Novembre' },
      { value: 12, label: 'Décembre' }
    ];

    this.generateYearOptions();
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadAllCriteres();

    this.evaluationForm.get('periode')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(periode => {
        this.showMonthSelector = periode === 'MENSUEL';
        if (!this.showMonthSelector) {
          this.evaluationForm.get('mois')?.setValue(null);
        } else {
          this.evaluationForm.get('mois')?.setValue(this.currentMonth);
        }
        this.cdr.detectChanges();
      });

    this.evaluationForm.get('employeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(employeeId => {
        console.log('📌 Employé sélectionné:', employeeId);
        this.selectedEmployeeId = employeeId;
        this.selectedCritereIds = new Set();
        
        if (employeeId) {
          this.loadCriteresForEmployee(employeeId);
        } else {
          this.availableCriteres = [];
          this.clearNotes();
        }
        
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateYearOptions(): void {
    this.isYearLoading = true;
    this.generateYearOptionsSimple();
    this.isYearLoading = false;
  }

  private generateYearOptionsSimple(): void {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - this.PAST_YEARS;
    const endYear = currentYear + this.FUTURE_YEARS;
    
    this.yearOptions = [];
    for (let i = startYear; i <= endYear; i++) {
      this.yearOptions.push(i);
    }
    
    console.log(`📅 Années générées: ${startYear} à ${endYear} (${this.yearOptions.length} années)`);
  }

  isPastYear(year: number): boolean {
    return year < this.currentYear;
  }

  isFutureYear(year: number): boolean {
    return year > this.currentYear;
  }

  isCurrentYear(year: number): boolean {
    return year === this.currentYear;
  }

  getYearLabel(year: number): string {
    if (this.isCurrentYear(year)) {
      return `${year} (Actuelle)`;
    }
    return `${year}`;
  }

  loadEmployees(): void {
    this.isLoading = true;
    console.log('🔄 Chargement des employés...');
    
    this.evaluationForm.get('employeId')?.disable();
    
    this.employeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees: Employee[]) => {
          this.employees = employees;
          this.isLoading = false;
          console.log('✅ Employés chargés:', employees.length);
          
          this.evaluationForm.get('employeId')?.enable();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Erreur chargement employés:', error);
          this.evaluationForm.get('employeId')?.enable();
          
          if (error.status === 401) {
            this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
          } else {
            this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', { duration: 3000 });
          }
          this.cdr.detectChanges();
        }
      });
  }

  loadAllCriteres(): void {
    this.performanceService.getActiveCriteres()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (criteres: CriterePerformance[]) => {
          this.allCriteres = criteres;
          console.log('✅ Tous les critères chargés:', criteres.length);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement critères:', error);
          if (error.status === 401) {
            this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
          } else {
            this.snackBar.open('Erreur lors du chargement des critères', 'Fermer', { duration: 3000 });
          }
        }
      });
  }

  loadCriteresForEmployee(employeeId: string): void {
    if (!employeeId) {
      console.warn('⚠️ employeeId est vide, chargement annulé');
      return;
    }
    
    this.isLoading = true;
    console.log(`🔄 Chargement des critères pour l'employé: ${employeeId}`);
    
    this.performanceService.getCriteresForEmployee(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (criteres: CriterePerformance[]) => {
          console.log(`✅ ${criteres.length} critères reçus:`, criteres);
          
          this.availableCriteres = criteres;
          this.isLoading = false;
          
          this.selectedCritereIds = new Set();
          this.availableCriteres.forEach(c => {
            if (c.id) {
              this.selectedCritereIds.add(c.id);
            }
          });
          
          this.initNotes();
          
          const globalCount = criteres.filter(c => c.typeCritere === 'GLOBAL' || !c.typeCritere).length;
          const selectiveCount = criteres.filter(c => c.typeCritere === 'SELECTIVE').length;
          
          console.log(`📊 ${criteres.length} critères disponibles (${globalCount} globaux, ${selectiveCount} sélectifs)`);
          
          if (criteres.length > 0) {
            this.snackBar.open(
              `${criteres.length} critères disponibles (${globalCount} globaux, ${selectiveCount} sélectifs)`,
              'Fermer',
              { duration: 3000 }
            );
          } else {
            this.snackBar.open('Aucun critère disponible pour cet employé', 'Fermer', { duration: 3000 });
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Erreur chargement critères:', error);
          
          this.availableCriteres = [];
          this.clearNotes();
          
          if (error.status === 404) {
            this.snackBar.open('Aucun critère trouvé pour cet employé', 'Fermer', { duration: 3000 });
          } else {
            this.snackBar.open('Erreur lors du chargement des critères', 'Fermer', { duration: 3000 });
          }
          
          this.cdr.detectChanges();
        }
      });
  }

  toggleCritereSelection(critereId: string, event: any): void {
    const isChecked = event.target.checked;
    
    if (isChecked) {
      this.selectedCritereIds.add(critereId);
    } else {
      this.selectedCritereIds.delete(critereId);
    }
    
    this.initNotes();
    this.cdr.detectChanges();
  }

  isCritereSelected(critereId: string): boolean {
    return this.selectedCritereIds.has(critereId);
  }

  clearNotes(): void {
    const notesArray = this.evaluationForm.get('notes') as FormArray;
    notesArray.clear();
  }

  initNotes(): void {
    const notesArray = this.evaluationForm.get('notes') as FormArray;
    notesArray.clear();
    
    this.availableCriteres.forEach(critere => {
      if (critere.id && this.selectedCritereIds.has(critere.id)) {
        notesArray.push(this.fb.group({
          critereId: [critere.id, Validators.required],
          critereNom: [critere.nom],
          note: [null, [Validators.required, Validators.min(0), Validators.max(critere.noteMaximale)]]
        }));
      }
    });
  }

  get notesArray(): FormArray {
    return this.evaluationForm.get('notes') as FormArray;
  }

  getNoteControl(index: number): FormControl {
    return this.notesArray.at(index).get('note') as FormControl;
  }

  getCritereId(index: number): string {
    return this.notesArray.at(index).get('critereId')?.value;
  }

  getCritereNom(index: number): string {
    const critereId = this.getCritereId(index);
    const critere = this.availableCriteres.find(c => c.id === critereId);
    return critere ? critere.nom : 'Critère';
  }

  getCritereType(index: number): string {
    const critereId = this.getCritereId(index);
    const critere = this.availableCriteres.find(c => c.id === critereId);
    return critere?.typeCritere || 'GLOBAL';
  }

  getCritereNoteMax(critereId: string): number {
    const critere = this.availableCriteres.find(c => c.id === critereId);
    return critere ? critere.noteMaximale : 10;
  }

  getPeriodeLabel(periode: string): string {
    return PeriodeEvaluationLabels[periode as keyof typeof PeriodeEvaluationLabels] || periode;
  }

  getMonthLabel(monthValue: number): string {
    const month = this.monthOptions.find(m => m.value === monthValue);
    return month ? month.label : '';
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

  checkExistingEvaluation(): void {
    const employeId = this.evaluationForm.get('employeId')?.value;
    const periode = this.evaluationForm.get('periode')?.value;
    const annee = this.evaluationForm.get('annee')?.value;
    const mois = this.evaluationForm.get('mois')?.value;

    if (!employeId || !periode || !annee) {
      return;
    }

    if (periode === 'MENSUEL' && !mois) {
      this.snackBar.open('Veuillez sélectionner un mois pour la période mensuelle', 'Fermer', { duration: 3000 });
      return;
    }

    this.snackBar.open('Vérification des évaluations existantes...', 'Fermer', { duration: 2000 });

    this.performanceService.checkExistingEvaluation(employeId, periode, annee)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exists) => {
          if (exists) {
            const employee = this.employees.find(e => e.id === employeId);
            const employeeName = employee ? this.getEmployeeDisplay(employee) : 'Cet employé';
            const periodeLabel = this.getPeriodeLabel(periode);
            let periodeDisplay = `${periodeLabel} ${annee}`;
            
            if (periode === 'MENSUEL' && mois) {
              periodeDisplay = `${this.getMonthLabel(mois)} ${annee}`;
            }
            
            this.snackBar.open(
              `${employeeName} a déjà une évaluation pour la période ${periodeDisplay}.`,
              'Fermer',
              { duration: 5000 }
            );
            this.showError = true;
          }
        },
        error: (error) => {
          console.error('❌ Erreur lors de la vérification:', error);
        }
      });
  }

 // evaluation-create.component.ts - onSubmit() corrigé

onSubmit(): void {
  this.showError = false;
  this.errorMessage = '';

  if (this.evaluationForm.invalid) {
    this.evaluationForm.markAllAsTouched();
    this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
    return;
  }

  const periode = this.evaluationForm.get('periode')?.value;
  if (periode === 'MENSUEL') {
    const mois = this.evaluationForm.get('mois')?.value;
    if (!mois) {
      this.snackBar.open('Veuillez sélectionner un mois pour la période mensuelle', 'Fermer', { duration: 3000 });
      return;
    }
  }

  if (this.selectedCritereIds.size === 0) {
    this.snackBar.open('Veuillez sélectionner au moins un critère pour l\'évaluation', 'Fermer', { duration: 3000 });
    return;
  }

  const notesFormArray = this.evaluationForm.get('notes') as FormArray;
  const hasValidNotes = notesFormArray.controls.some(control => {
    const note = control.get('note')?.value;
    return note !== null && note !== undefined && note !== '';
  });

  if (!hasValidNotes) {
    this.snackBar.open('Veuillez attribuer des notes pour les critères sélectionnés', 'Fermer', { duration: 3000 });
    return;
  }

  const allNotesValid = notesFormArray.controls.every(control => {
    const note = control.get('note')?.value;
    const critereId = control.get('critereId')?.value;
    const critere = this.availableCriteres.find(c => c.id === critereId);
    const maxNote = critere ? critere.noteMaximale : 10;
    return note !== null && note !== undefined && note >= 0 && note <= maxNote;
  });

  if (!allNotesValid) {
    this.snackBar.open('Veuillez saisir des notes valides pour tous les critères', 'Fermer', { duration: 3000 });
    return;
  }

  const formValue = this.evaluationForm.value;
  const notes = formValue.notes.map((note: any) => ({
    critereId: note.critereId,
    note: note.note
  }));

  const data: any = {
    employeId: formValue.employeId,
    periode: formValue.periode,
    annee: formValue.annee,
    commentaires: formValue.commentaires || '',
    notes: notes
  };

  if (formValue.periode === 'MENSUEL' && formValue.mois) {
    data.mois = formValue.mois;
  }

  console.log('📤 Envoi des données:', JSON.stringify(data, null, 2));
  this.submitting = true;

  this.performanceService.createEvaluation(data)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (evaluation) => {
        console.log('✅ Évaluation créée avec succès:', evaluation);
        this.submitting = false;
        
        this.snackBar.open('✅ Évaluation créée avec succès !', 'Fermer', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // ✅ SOLUTION: Rester sur la page et réinitialiser le formulaire
        // Cela évite complètement les problèmes de guard
        setTimeout(() => {
          // Sauvegarder l'ID de l'employé sélectionné pour le réutiliser
          const currentEmployeeId = this.evaluationForm.get('employeId')?.value;
          
          // Réinitialiser le formulaire
          this.evaluationForm.reset();
          this.evaluationForm.patchValue({ 
            annee: this.currentYear,
            periode: '',
            mois: this.currentMonth,
            employeId: currentEmployeeId // Garder le même employé
          });
          
          // Réinitialiser les critères
          this.selectedCritereIds = new Set();
          this.clearNotes();
          
          // Recharger les critères pour le même employé
          if (currentEmployeeId) {
            this.loadCriteresForEmployee(currentEmployeeId);
          }
          
          // Marquer le formulaire comme propre
          this.evaluationForm.markAsPristine();
          this.evaluationForm.markAsUntouched();
          
          this.snackBar.open('Formulaire réinitialisé, vous pouvez créer une autre évaluation', 'Fermer', { duration: 3000 });
        }, 500);
      },
      error: (error) => {
        console.error('❌ Erreur création évaluation:', error);
        this.submitting = false;
        
        let errorMessage = 'Erreur lors de la création';
        
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          // ✅ NE PAS DÉCONNECTER AUTOMATIQUEMENT
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission de créer une évaluation.';
        } else if (error.status === 409) {
          const employee = this.employees.find(e => e.id === formValue.employeId);
          const employeeName = employee ? this.getEmployeeDisplay(employee) : 'Cet employé';
          const periodeLabel = this.getPeriodeLabel(formValue.periode);
          let periodeDisplay = `${periodeLabel} ${formValue.annee}`;
          
          if (formValue.periode === 'MENSUEL' && formValue.mois) {
            periodeDisplay = `${this.getMonthLabel(formValue.mois)} ${formValue.annee}`;
          }
          
          errorMessage = `${employeeName} a déjà une évaluation pour la période ${periodeDisplay}.`;
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          this.showError = true;
        } else if (error.status === 400) {
          errorMessage = 'Données invalides. Vérifiez les champs et les notes.';
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
        this.errorMessage = errorMessage;
      }
    });
}

  cancel(): void {
    this.router.navigate(['/performance/evaluations']);
  }
}