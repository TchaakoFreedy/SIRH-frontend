import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardManagerResponse } from '../../models/dashboard-manager.model';
import { StatsCardComponent } from '../stats-card/stats-card.component';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { RecentActivitiesComponent } from '../recent-activities/recent-activities.component';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardComponent,
    ChartCardComponent,
    RecentActivitiesComponent,
  ],
  template: `
    <!-- KPI Stats -->
    <div class="stats-grid">
      <app-stats-card
        icon="group"
        color="#006972"
        title="Taille équipe"
        [value]="data.teamSize"
      />
      <app-stats-card
        icon="beach_access"
        color="#ba1a1a"
        title="Absents aujourd'hui"
        [value]="data.employeesAbsentToday"
      />
      <app-stats-card
        icon="pending_actions"
        color="#f59e0b"
        title="Congés à approuver"
        [value]="data.pendingApprovals"
      />
      <app-stats-card
        icon="analytics"
        color="#006d37"
        title="Taux de présence"
        [value]="data.presenceRate"
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
        title="Répartition des postes"
        [labels]="data.positionsDistribution.map(p => p.positionName)"
        [datasets]="[{ label: 'Effectifs', data: data.positionsDistribution.map(p => p.count), backgroundColor: ['#006972', '#18b8c8', '#4ae183', '#f59e0b'] }]"
        type="doughnut"
      />
      <app-chart-card
        title="Évolution des congés"
        [labels]="data.leaveEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Congés', data: data.leaveEvolution.map(e => e.count), backgroundColor: '#18b8c8' }]"
        type="line"
      />

      <!-- Nouveaux graphiques pour discipline, sanctions et performance -->
      <app-chart-card
        title="Évolution des demandes d'explication"
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
        title="Évolution des notes de performance"
        [labels]="data.performanceEvolution.map(p => p.month)"
        [datasets]="[{ label: 'Note moyenne', data: data.performanceEvolution.map(p => p.averageScore), backgroundColor: '#2980b9', borderColor: '#2980b9' }]"
        type="line"
      />
    </div>

    <app-recent-activities [activities]="data.recentActivities" />
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboardComponent {
  @Input({ required: true }) data!: DashboardManagerResponse;
}