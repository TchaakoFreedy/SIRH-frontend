import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardEmployeeResponse } from '../../models/dashboard-employee.model';
import { StatsCardComponent } from '../stats-card/stats-card.component';
import { AlertPanelComponent } from '../alert-panel/alert-panel.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardComponent,
    AlertPanelComponent,
  ],
  template: `
    <div class="stats-grid">
      <app-stats-card
        icon="event_available"
        color="#006972"
        title="Solde de congés"
        [value]="data.leaveBalance"
      />
      <app-stats-card
        icon="check_circle"
        color="#006d37"
        title="Congés pris"
        [value]="data.takenLeaves"
      />
      <app-stats-card
        icon="pending"
        color="#f59e0b"
        title="Congés en attente"
        [value]="data.pendingLeaves"
      />
    </div>

    <div class="contract-documents">
      <!-- Contrat -->
      <div class="card">
        <h3>Mon contrat</h3>
        @if (data.currentContract) {
          <div class="contract-info">
            <p><strong>Type :</strong> {{ data.currentContract.type }}</p>
            <p><strong>Début :</strong> {{ data.currentContract.startDate | date }}</p>
            <p><strong>Fin :</strong> {{ data.currentContract.endDate | date }}</p>
            <p><strong>Statut :</strong> {{ data.currentContract.status }}</p>
          </div>
        } @else {
          <p>Aucun contrat actif</p>
        }
      </div>

      <!-- Documents -->
      <div class="card">
        <h3>Mes documents</h3>
        @if (data.documents.length > 0) {
          <ul>
            @for (doc of data.documents; track doc.id) {
              <li>
                <span class="material-symbols-outlined">description</span>
                {{ doc.name }}
                <span class="badge">{{ doc.type }}</span>
              </li>
            }
          </ul>
        } @else {
          <p>Aucun document</p>
        }
      </div>
    </div>

    <app-alert-panel [alerts]="data.notifications" />
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .contract-documents {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.03);
    }
    .card h3 {
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .contract-info p {
      margin: 0.25rem 0;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    ul li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .badge {
      background: #e2e8f0;
      padding: 0.1rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.7rem;
    }
    @media (max-width: 768px) {
      .contract-documents {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDashboardComponent {
  @Input({ required: true }) data!: DashboardEmployeeResponse;
}