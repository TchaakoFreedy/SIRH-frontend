// src/app/features/pay-slip/pay-slip-edit.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { PaySlipService } from '../../core/services/pay-slip.service';

@Component({
  selector: 'app-pay-slip-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './pay-slip-edit.component.html',
  styleUrls: ['./pay-slip-edit.component.css']
})
export class PaySlipEditComponent implements OnInit, OnDestroy {
  editForm: FormGroup;
  id: string = '';
  loading = false;
  error = '';
  success = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private paySlipService: PaySlipService,
    private cdr: ChangeDetectorRef   // ✅ Injection
  ) {
    this.editForm = this.fb.group({
      grossSalary: ['', [Validators.required, Validators.min(0)]],
      netSalary: ['', [Validators.required, Validators.min(0)]],
      deductions: ['', [Validators.min(0)]],
      month: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      year: ['', [Validators.required, Validators.min(2000)]]
    });
  }

  ngOnInit(): void {
    // ✅ Utilisation réactive de paramMap
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.id = params.get('id') || '';
        if (this.id) {
          this.loadData();
        } else {
          this.error = '⚠️ ID du bulletin manquant.';
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    // Vérification de l'ID
    if (!this.id || this.id.trim() === '') {
      this.error = '⚠️ ID invalide.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges(); // Affiche le loader

    this.paySlipService.getById(this.id.trim())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
          console.log('✅ Édition : loading mis à false');
        })
      )
      .subscribe({
        next: (data) => {
          this.editForm.patchValue({
            grossSalary: data.grossSalary,
            netSalary: data.netSalary,
            deductions: data.deductions || 0,
            month: data.month,
            year: data.year
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Erreur chargement édition :', err);
          let msg = 'Erreur de chargement : ' + (err.message || 'Impossible de récupérer le bulletin.');
          if (err.status === 401 || err.status === 403) {
            msg = '⛔ Vous n\'avez pas les droits nécessaires pour modifier ce bulletin.';
          }
          this.error = msg;
          this.cdr.detectChanges();
        }
      });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.error = 'Veuillez corriger les erreurs du formulaire.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges();

    this.paySlipService.update(this.id, this.editForm.value)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
          console.log('✅ Édition : mise à jour terminée');
        })
      )
      .subscribe({
        next: () => {
          this.success = '✅ Bulletin mis à jour avec succès !';
          this.cdr.detectChanges();
          // Redirection après un court délai
          setTimeout(() => this.router.navigate(['/app/paie/historique']), 1500);
        },
        error: (err) => {
          console.error('❌ Erreur mise à jour :', err);
          let msg = err.message || 'Erreur lors de la mise à jour.';
          if (err.status === 401 || err.status === 403) {
            msg = '⛔ Vous n\'avez pas les droits nécessaires pour effectuer cette modification.';
          } else if (err.status === 400) {
            msg = '⚠️ Données invalides. Vérifiez les champs.';
          }
          this.error = msg;
          this.cdr.detectChanges();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/app/paie/historique']);
  }
}