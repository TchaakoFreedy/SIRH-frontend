// src/app/features/rh/documents/components/attestation-travail/attestation-travail.component.ts

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentGeneratorService } from '../../services/document-generator.service';

@Component({
  selector: 'app-attestation-travail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="btn-generate" (click)="generate()" [disabled]="loading">
      <i class="fas fa-file-pdf"></i>
      {{ loading ? 'Génération...' : 'Générer l\'attestation' }}
    </button>
  `,
  styles: [`
    .btn-generate {
      background: linear-gradient(135deg, #0d9488, #14b8a6);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-generate:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(13, 148, 136, 0.3);
    }
    .btn-generate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class AttestationTravailComponent {
  private documentGenerator = inject(DocumentGeneratorService);

  @Input() employee: any;
  @Input() motif: string = '';
  @Output() generated = new EventEmitter<void>();
  
  loading = false;

  async generate(): Promise<void> {
    if (!this.employee) {
      console.error('❌ Aucun employé sélectionné');
      return;
    }

    this.loading = true;
    try {
      await this.documentGenerator.generateAttestationTravail(this.employee, this.motif);
      this.generated.emit();
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      alert('Erreur lors de la génération de l\'attestation. Veuillez réessayer.');
    } finally {
      this.loading = false;
    }
  }
}