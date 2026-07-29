import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EntrepriseService } from '../../../core/services/entreprise.service';
import { Entreprise, EntreprisePayload } from '../../../core/models';


interface EntrepriseFormDialogData {
  entreprise?: Entreprise;
}

@Component({
  selector: 'app-entreprise-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './entreprise-form-dialog.component.html',
  styleUrls: ['./entreprise-form-dialog.component.css']
})
export class EntrepriseFormDialogComponent implements OnInit {
  form!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EntrepriseFormDialogComponent>,
    private service: EntrepriseService,
    @Inject(MAT_DIALOG_DATA) public data: EntrepriseFormDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.data?.entreprise) {
      this.patchForm(this.data.entreprise);
    }
  }

  get isEditMode(): boolean {
    return !!this.data?.entreprise;
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      siege: ['', [Validators.maxLength(200)]],
      adresse: ['', [Validators.maxLength(200)]],
      telephone: ['', [Validators.pattern(/^[0-9+\-\s]{8,20}$/)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      statut: ['ACTIF', [Validators.required]]
    });
  }

  patchForm(entreprise: Entreprise): void {
    this.form.patchValue({
      name: entreprise.name,
      siege: entreprise.siege || '',
      adresse: entreprise.adresse || '',
      telephone: entreprise.telephone || '',
      email: entreprise.email || '',
      statut: entreprise.statut || 'ACTIF'
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }

 submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);

    // 1. Use getRawValue() and cast directly to your clean EntreprisePayload contract
    const payload = this.form.getRawValue() as EntreprisePayload;

    // 2. Pass the explicitly typed payload down to your service methods
    const request$ = this.isEditMode
      ? this.service.update(this.data.entreprise!.id!, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        console.error('Erreur formulaire entreprise', error);
        this.errorMessage.set('Impossible de sauvegarder l’entreprise. Réessayez.');
        this.isLoading.set(false);
      }
    });
  }
}
