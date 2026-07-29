// src/app/features/organisation/entreprises/confirm-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="dialog-header">
        <mat-icon class="dialog-icon" [style.color]="data.confirmColor === 'warn' ? '#ef4444' : '#0d9488'">
          {{ data.confirmColor === 'warn' ? 'warning' : 'info' }}
        </mat-icon>
        <h2 class="dialog-title">{{ data.title }}</h2>
      </div>

      <div class="dialog-content">
        <p>{{ data.message }}</p>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close(false)" class="btn-cancel">
          {{ data.cancelLabel || 'Annuler' }}
        </button>
        <button 
          mat-raised-button 
          [color]="data.confirmColor || 'primary'" 
          (click)="close(true)"
          class="btn-confirm"
        >
          {{ data.confirmLabel || 'Confirmer' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 8px 0;
      min-width: 320px;
      max-width: 480px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px 8px 24px;
      border-bottom: 1px solid #f1f5f9;
    }

    .dialog-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }

    .dialog-content {
      padding: 20px 24px;
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
    }

    .dialog-content p {
      margin: 0;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 24px 20px 24px;
      border-top: 1px solid #f1f5f9;
    }

    .btn-cancel {
      color: #64748b;
      font-weight: 500;
    }

    .btn-cancel:hover {
      background: #f1f5f9;
    }

    .btn-confirm {
      font-weight: 600;
      padding: 0 24px;
    }

    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-shape: 16px;
      --mdc-dialog-container-color: #ffffff;
    }

    ::ng-deep .mat-mdc-dialog-surface {
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15) !important;
      border-radius: 16px !important;
      overflow: hidden !important;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  close(value: boolean): void {
    this.dialogRef.close(value);
  }
}