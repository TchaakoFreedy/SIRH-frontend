import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Entreprise } from '../../../core/models';

export interface EntrepriseDetailsDialogData {
  entreprise: Entreprise;
}

@Component({
  selector: 'app-entreprise-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './entreprise-details-dialog.component.html',
  styleUrls: ['./entreprise-details-dialog.component.css']
})
export class EntrepriseDetailsDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<EntrepriseDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EntrepriseDetailsDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
