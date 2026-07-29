import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaySlipService } from '../../core/services/pay-slip.service';
import { PaySlip } from '../../core/models/pay-slip.model';

@Component({
  selector: 'app-pay-slip-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container">
      <h2>📋 Historique des bulletins</h2>

      <div *ngIf="loading" class="loading">⏳ Chargement...</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <table *ngIf="!loading && !error" class="table">
        <thead>
          <tr>
            <th>Employé</th>
            <th>Matricule</th>
            <th>Période</th>
            <th>Salaire net</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let slip of paySlips">
            <td>{{ slip.employeeFullName }}</td>
            <td>{{ slip.employeeMatricule }}</td>
            <td>{{ slip.period }}</td>
            <td>{{ slip.netSalary | currency:'XOF':'symbol':'1.0-0' }}</td>
            <td>
              <!-- ✅ Utilisation de slip.id -->
              <a [routerLink]="['/app/paie/pay-slip-detail', slip.id]" class="btn-detail">
                Voir
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .btn-detail { background: #007bff; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none; }
    .btn-detail:hover { background: #0056b3; }
    .loading { color: #666; }
    .error { color: red; }
  `]
})
export class PaySlipHistoryComponent implements OnInit {
  paySlips: PaySlip[] = [];
  loading = false;
  error = '';

  constructor(private paySlipService: PaySlipService) {}

  ngOnInit(): void {
    this.loadPaySlips();
  }

  loadPaySlips(): void {
    this.loading = true;
    this.paySlipService.getAll().subscribe({
      next: (data) => {
        console.log('📋 Bulletins reçus :', data);
        this.paySlips = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement :', err);
        this.error = 'Impossible de charger la liste des bulletins.';
        this.loading = false;
      }
    });
  }
}