import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardEmployeeResponse } from '../../models/dashboard-employee.model';
import { StatsCardComponent } from '../stats-card/stats-card.component';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { AlertPanelComponent } from '../alert-panel/alert-panel.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardComponent,
    ChartCardComponent,
    AlertPanelComponent,
  ],
  template: `
    <!-- KPI Stats -->
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

      <!-- Nouvelles cartes pour discipline, sanctions et performance -->
      <app-stats-card
        icon="help"
        color="#e67e22"
        title="Demandes d'explication en attente"
        [value]="data.pendingExplanationRequests"
      />
      <app-stats-card
        icon="gavel"
        color="#c0392b"
        title="Sanctions actives"
        [value]="data.activeSanctions"
      />
      <app-stats-card
        icon="assessment"
        color="#2980b9"
        title="Évaluations en attente"
        [value]="data.pendingEvaluations"
      />
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <app-chart-card
        title="Évolution de mes demandes d'explication"
        [labels]="data.explanationRequestsEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Demandes', data: data.explanationRequestsEvolution.map(e => e.count), backgroundColor: '#e67e22' }]"
        type="line"
      />
      <app-chart-card
        title="Mes sanctions par type"
        [labels]="data.sanctionsByType.map(s => s.type)"
        [datasets]="[{ label: 'Sanctions', data: data.sanctionsByType.map(s => s.count), backgroundColor: ['#c0392b', '#e74c3c', '#f39c12', '#8e44ad'] }]"
        type="doughnut"
      />
      <app-chart-card
        title="Évolution de mes notes de performance"
        [labels]="data.performanceEvolution.map(p => p.month)"
        [datasets]="[{ label: 'Note moyenne', data: data.performanceEvolution.map(p => p.averageScore), backgroundColor: '#2980b9', borderColor: '#2980b9' }]"
        type="line"
      />
    </div>

    <!-- Contrat et documents -->
    <div class="contract-documents">
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
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
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