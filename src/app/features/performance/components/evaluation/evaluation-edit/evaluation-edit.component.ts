// src/app/features/performance/components/evaluation/evaluation-edit/evaluation-edit.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerformanceService } from '../../../services/performance.service';
import { EmployeService } from '../../../../../core/services/employe.service';
import { AuthService } from '../../../../../services/auth.service';
import { CriterePerformance } from '../../../models/critere-performance.model';
import { PeriodeEvaluation, PeriodeEvaluationLabels } from '../../../models/periode-evaluation.enum';
import { Employee } from '../../../../../core/models/employee.model';
import { EvaluationPerformance } from '../../../models/evaluation-performance.model';

@Component({
  selector: 'app-evaluation-edit',
  standalone: false,
  templateUrl: './evaluation-edit.component.html',
  styleUrls: ['./evaluation-edit.component.scss']
})
export class EvaluationEditComponent implements OnInit {
  evaluationForm: FormGroup;
  evaluationId!: string;
  employees: Employee[] = [];
  criteres: CriterePerformance[] = [];
  periodeOptions = Object.values(PeriodeEvaluation);
  currentYear = new Date().getFullYear();
  yearOptions: number[] = [];
  isLoading = false;
  submitting = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private performanceService: PerformanceService,
    private employeService: EmployeService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.evaluationForm = this.fb.group({
      employeId: ['', Validators.required],
      periode: ['', Validators.required],
      annee: [this.currentYear, Validators.required],
      commentaires: [''],
      notes: this.fb.array([])
    });

    for (let i = this.currentYear - 5; i <= this.currentYear + 5; i++) {
      this.yearOptions.push(i);
    }
  }

  ngOnInit(): void {
    this.evaluationId = this.route.snapshot.paramMap.get('id')!;
    
    if (!this.evaluationId) {
      this.snackBar.open('ID d\'évaluation manquant', 'Fermer', { duration: 3000 });
      this.router.navigate(['/app/performance/evaluations']);
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('Vous devez être connecté', 'Fermer', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    // Charger les employés et les critères en parallèle
    Promise.all([
      this.loadEmployees(),
      this.loadCriteres()
    ]).then(() => {
      // Une fois les deux chargés, charger l'évaluation
      this.loadEvaluation();
    }).catch((error) => {
      console.error('❌ Erreur lors du chargement initial:', error);
      this.isLoading = false;
      this.cdr.detectChanges();
      this.snackBar.open('Erreur lors du chargement des données', 'Fermer', { duration: 3000 });
    });
  }

  loadEmployees(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.employeService.getAll().subscribe({
        next: (employees: Employee[]) => {
          this.employees = employees;
          console.log('✅ Employés chargés:', employees.length);
          resolve();
        },
        error: (error) => {
          console.error('❌ Erreur chargement employés:', error);
          reject(error);
        }
      });
    });
  }

  loadCriteres(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.performanceService.getActiveCriteres().subscribe({
        next: (criteres: CriterePerformance[]) => {
          this.criteres = criteres;
          console.log('✅ Critères chargés:', criteres.length);
          resolve();
        },
        error: (error) => {
          console.error('❌ Erreur chargement critères:', error);
          reject(error);
        }
      });
    });
  }

  loadEvaluation(): void {
    this.performanceService.getEvaluationById(this.evaluationId).subscribe({
      next: (evaluation: EvaluationPerformance) => {
        console.log('✅ Évaluation chargée:', evaluation);
        
        // Remplir le formulaire avec les données de l'évaluation
        this.evaluationForm.patchValue({
          employeId: evaluation.employeId,
          periode: evaluation.periode,
          annee: evaluation.annee,
          commentaires: evaluation.commentaires || ''
        });

        // Initialiser les notes
        this.initNotes(evaluation.notes || []);
        
        this.isLoading = false;
        this.cdr.detectChanges();
        
        console.log('🔓 Formulaire rempli avec succès');
      },
      error: (error) => {
        console.error('❌ Erreur chargement évaluation:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Erreur lors du chargement de l\'évaluation', 'Fermer', { duration: 3000 });
        this.router.navigate(['/app/performance/evaluations']);
      }
    });
  }

  initNotes(existingNotes: any[] = []): void {
    const notesArray = this.evaluationForm.get('notes') as FormArray;
    notesArray.clear();

    // Créer un map des notes existantes par critereId
    const notesMap = new Map();
    existingNotes.forEach((note: any) => {
      notesMap.set(note.critereId, note.note);
    });

    this.criteres.forEach(critere => {
      const noteValue = notesMap.get(critere.id) || null;
      notesArray.push(this.fb.group({
        critereId: [critere.id, Validators.required],
        note: [noteValue, [Validators.required, Validators.min(0), Validators.max(critere.noteMaximale)]]
      }));
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
    const critere = this.criteres.find(c => c.id === critereId);
    return critere ? critere.nom : 'Critère';
  }

  getCritereNoteMax(critereId: string): number {
    const critere = this.criteres.find(c => c.id === critereId);
    return critere ? critere.noteMaximale : 10;
  }

  getPeriodeLabel(periode: string): string {
    return PeriodeEvaluationLabels[periode as keyof typeof PeriodeEvaluationLabels] || periode;
  }

  getEmployeeDisplay(emp: Employee): string {
    const prenom = emp.prenom || '';
    const nom = emp.nom || '';
    const nomComplet = `${prenom} ${nom}`.trim();
    if (nomComplet) {
      return nomComplet;
    }
    return emp.matriculeInterne || emp.matricule_CNPS || 'Employé sans nom';
  }

  getEmployeeDisplayById(employeeId: string): string {
    if (!employeeId) return '—';
    const employee = this.employees.find(e => e.id === employeeId);
    return employee ? this.getEmployeeDisplay(employee) : '—';
  }

  onSubmit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    // Vérifier que toutes les notes sont valides
    const notesFormArray = this.evaluationForm.get('notes') as FormArray;
    const allNotesValid = notesFormArray.controls.every(control => {
      const note = control.get('note')?.value;
      const critereId = control.get('critereId')?.value;
      const critere = this.criteres.find(c => c.id === critereId);
      const maxNote = critere ? critere.noteMaximale : 10;
      return note !== null && note !== undefined && note >= 0 && note <= maxNote;
    });

    if (!allNotesValid) {
      this.snackBar.open('Veuillez saisir des notes valides pour tous les critères', 'Fermer', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const formValue = this.evaluationForm.value;
    const notes = formValue.notes.map((note: any) => ({
      critereId: note.critereId,
      note: note.note
    }));

    const data = {
      employeId: formValue.employeId,
      periode: formValue.periode,
      annee: formValue.annee,
      commentaires: formValue.commentaires || '',
      notes: notes
    };

    console.log('📤 Envoi des données de mise à jour:', data);

    this.performanceService.updateEvaluation(this.evaluationId, data).subscribe({
      next: (evaluation) => {
        console.log('✅ Évaluation mise à jour avec succès:', evaluation);
        this.submitting = false;
        this.snackBar.open('Évaluation mise à jour avec succès !', 'Fermer', { duration: 3000 });
        this.router.navigate(['/app/performance/evaluations']);
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour évaluation:', error);
        this.submitting = false;
        
        let errorMessage = 'Erreur lors de la mise à jour';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Évaluation non trouvée';
        } else if (error.status === 400) {
          errorMessage = 'Données invalides. Vérifiez les champs.';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission.';
        } else if (error.status === 409) {
          errorMessage = 'Une évaluation existe déjà pour cette période.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Contactez l\'administrateur.';
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/app/performance/evaluations']);
  }
}