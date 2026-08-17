import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PerformanceService } from '../../../services/performance.service';
import { CriterePerformance } from '../../../models/critere-performance.model';

@Component({
  selector: 'app-critere-edit',
  standalone: false,
  templateUrl: './critere-edit.component.html',
  styleUrls: ['./critere-edit.component.scss']
})
export class CritereEditComponent implements OnInit {
  critereForm: FormGroup;
  critereId!: string;
  isLoading = true;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private performanceService: PerformanceService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.critereForm = this.fb.group({
      nom: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      noteMaximale: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      coefficient: [1, [Validators.required, Validators.min(1)]],
      actif: [true]
    });
  }

  ngOnInit(): void {
    this.critereId = this.route.snapshot.paramMap.get('id')!;
    console.log('🔍 ID du critère:', this.critereId);
    
    if (!this.critereId) {
      this.snackBar.open('ID du critère manquant', 'Fermer', { duration: 3000 });
      this.router.navigate(['/app/performance/criteres']);
      return;
    }
    this.loadCritere();
  }

  loadCritere(): void {
    this.isLoading = true;
    console.log('📡 Chargement du critère...');
    
    this.performanceService.getCritereById(this.critereId).subscribe({
      next: (data: CriterePerformance) => {
        console.log('✅ Critère reçu:', data);
        
        this.critereForm.patchValue({
          nom: data.nom,
          description: data.description || '',
          noteMaximale: data.noteMaximale,
          coefficient: data.coefficient,
          actif: data.actif !== undefined ? data.actif : true
        });
        
        this.isLoading = false;
        this.cdr.detectChanges();
        
        console.log('🔓 isLoading = false, formulaire mis à jour');
      },
      error: (error) => {
        console.error('❌ Erreur chargement critère:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Erreur lors du chargement du critère', 'Fermer', { duration: 3000 });
        this.router.navigate(['/app/performance/criteres']);
      }
    });
  }

  onSubmit(): void {
    if (this.critereForm.invalid) {
      this.critereForm.markAllAsTouched();
      Object.keys(this.critereForm.controls).forEach(key => {
        const control = this.critereForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.snackBar.open('Veuillez corriger les erreurs du formulaire', 'Fermer', { duration: 3000 });
      return;
    }

    this.submitting = true;
    const formValue = this.critereForm.value;
    console.log('📤 Envoi des données de mise à jour:', formValue);

    this.performanceService.updateCritere(this.critereId, formValue).subscribe({
      next: () => {
        this.snackBar.open('✅ Critère mis à jour avec succès !', 'Fermer', { duration: 3000 });
        this.router.navigate(['/app/performance/criteres']);
      },
      error: (error) => {
        this.submitting = false;
        this.cdr.detectChanges();
        console.error('❌ Erreur mise à jour critère:', error);
        let errorMessage = 'Erreur lors de la mise à jour';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Critère non trouvé';
        } else if (error.status === 400) {
          errorMessage = 'Données invalides. Vérifiez les champs.';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Contactez l\'administrateur.';
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    // ✅ Utiliser preventDefault pour éviter tout comportement par défaut
    event?.preventDefault();
    event?.stopPropagation();
    this.router.navigate(['/app/performance/criteres']);
  }

  get f() {
    return this.critereForm.controls;
  }
}