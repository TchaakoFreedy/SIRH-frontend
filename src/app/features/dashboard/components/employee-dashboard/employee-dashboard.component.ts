// src/app/features/dashboard/components/employee-dashboard/employee-dashboard.component.ts

import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
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

      <app-stats-card
        icon="help"
        color="#e67e22"
        title="Demandes d'explication en attente"
        [value]="data.pendingExplanationRequests || 0"
      />
      <app-stats-card
        icon="gavel"
        color="#c0392b"
        title="Sanctions actives"
        [value]="data.activeSanctions || 0"
      />
      <app-stats-card
        icon="assessment"
        color="#2980b9"
        title="Évaluations en attente"
        [value]="data.pendingEvaluations || 0"
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
        @if (data.documents && data.documents.length > 0) {
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

    <!-- Alerte panel -->
    <app-alert-panel [alerts]="data.notifications || []" />
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
      margin-top: 0;
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
export class EmployeeDashboardComponent implements OnChanges {
  @Input({ required: true }) data!: DashboardEmployeeResponse;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      console.log('📊 EmployeeDashboard - Données reçues:', this.data);
      console.log('📊 Explanation evolution:', this.data.explanationRequestsEvolution);
      console.log('📊 Sanctions by type:', this.data.sanctionsByType);
      console.log('📊 Performance evolution:', this.data.performanceEvolution);
    }
  }

  // ============================================================
  // DEMANDES D'EXPLICATION - Graphique
  // ============================================================

  getExplanationLabels(): string[] {
    const data = this.data.explanationRequestsEvolution || [];
    return data.map(e => e.month);
  }

  getExplanationDatasets(): any[] {
    const data = this.data.explanationRequestsEvolution || [];
    const values = data.map(e => e.count);
    return [{
      label: 'Demandes',
      data: values,
      backgroundColor: '#e67e22',
      borderColor: '#e67e22',
      fill: false,
      tension: 0.3,
    }];
  }

  // ============================================================
  // SANCTIONS PAR TYPE - Graphique
  // ============================================================

  getSanctionsLabels(): string[] {
    const data = this.data.sanctionsByType || [];
    return data.map(s => s.type);
  }

  getSanctionsDatasets(): any[] {
    const data = this.data.sanctionsByType || [];
    const values = data.map(s => s.count);
    const colors = ['#c0392b', '#e74c3c', '#f39c12', '#8e44ad', '#2980b9', '#2ecc71'];
    return [{
      label: 'Sanctions',
      data: values,
      backgroundColor: colors.slice(0, values.length),
      borderWidth: 2,
    }];
  }

  // ============================================================
  // PERFORMANCE - Graphique
  // ============================================================

  getPerformanceLabels(): string[] {
    const data = this.data.performanceEvolution || [];
    return data.map(p => p.month);
  }

  getPerformanceDatasets(): any[] {
    const data = this.data.performanceEvolution || [];
    const values = data.map(p => p.averageScore);
    return [{
      label: 'Note moyenne',
      data: values,
      backgroundColor: '#2980b9',
      borderColor: '#2980b9',
      fill: false,
      tension: 0.3,
    }];
  }
}