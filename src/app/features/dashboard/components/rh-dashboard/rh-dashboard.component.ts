import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRHResponse } from '../../models/dashboard-rh.model';
import { StatsCardComponent } from '../stats-card/stats-card.component';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { AlertPanelComponent } from '../alert-panel/alert-panel.component';
import { RecentActivitiesComponent } from '../recent-activities/recent-activities.component';

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardComponent,
    ChartCardComponent,
    AlertPanelComponent,
    RecentActivitiesComponent,
  ],
  template: `
    <!-- KPI Stats -->
    <div class="stats-grid">
      <app-stats-card
        icon="groups"
        color="#006972"
        title="Employés"
        [value]="data.totalEmployees"
      />
      <app-stats-card
        icon="business"
        color="#006d37"
        title="Départements"
        [value]="data.totalDepartments"
      />
      <app-stats-card
        icon="work"
        color="#18b8c8"
        title="Postes"
        [value]="data.totalPositions"
      />
      <app-stats-card
        icon="assignment"
        color="#5c5f60"
        title="Contrats actifs"
        [value]="data.activeContracts"
      />
      <app-stats-card
        icon="beach_access"
        color="#16c067"
        title="En congé aujourd'hui"
        [value]="data.employeesOnLeaveToday"
      />
  

      <!-- Nouvelles cartes pour discipline, sanctions et performance -->
      <app-stats-card
        icon="help"
        color="#e67e22"
        title="Demandes d'explication en attente"
        [value]="data.pendingExplanationRequests"
      />
      
      <app-stats-card
        icon="assessment"
        color="#2980b9"
        title="Évaluations en attente"
        [value]="data.pendingEvaluations"
      />
    </div>

    <!-- Charts existants -->
    <div class="charts-grid">
      <app-chart-card
        title="Évolution des recrutements"
        [labels]="data.recruitmentEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Recrutements', data: data.recruitmentEvolution.map(e => e.count), backgroundColor: '#006972' }]"
        type="line"
      />
      <app-chart-card
        title="Évolution des congés"
        [labels]="data.leaveEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Congés', data: data.leaveEvolution.map(e => e.count), backgroundColor: '#18b8c8' }]"
        type="line"
      />
      <app-chart-card
        title="Répartition des contrats"
        [labels]="data.contractDistribution.map(c => c.type)"
        [datasets]="[{ label: 'Contrats', data: data.contractDistribution.map(c => c.count), backgroundColor: ['#006972', '#18b8c8', '#4ae183'] }]"
        type="doughnut"
      />
      <app-chart-card
        title="Employés par département"
        [labels]="data.employeesByDepartment.map(d => d.departmentName)"
        [datasets]="[{ label: 'Employés', data: data.employeesByDepartment.map(d => d.count), backgroundColor: '#006972' }]"
        type="bar"
      />

      <!-- Nouveaux graphiques pour discipline, sanctions et performance -->
      <app-chart-card
        title="Demandes d'explication"
        [labels]="data.explanationRequestsEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Demandes', data: data.explanationRequestsEvolution.map(e => e.count), backgroundColor: '#e67e22' }]"
        type="line"
      />
      <app-chart-card
        title="Répartition des sanctions"
        [labels]="data.sanctionsByType.map(s => s.type)"
        [datasets]="[{ label: 'Sanctions', data: data.sanctionsByType.map(s => s.count), backgroundColor: ['#c0392b', '#e74c3c', '#f39c12', '#8e44ad'] }]"
        type="doughnut"
      />
      <app-chart-card
        title="Évolution des performance"
        [labels]="data.performanceEvolution.map(p => p.month)"
        [datasets]="[{ label: 'Note moyenne', data: data.performanceEvolution.map(p => p.averageScore), backgroundColor: '#2980b9', borderColor: '#2980b9' }]"
        type="line"
      />
    </div>

    <!-- Alertes et activités -->
    <div class="alerts-activities">
      <app-alert-panel [alerts]="data.alerts" />
      <app-recent-activities [activities]="data.recentActivities" />
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
      grid-auto-rows: 1fr;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .alerts-activities {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .alerts-activities {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RhDashboardComponent {
  @Input({ required: true }) data!: DashboardRHResponse;
}