import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDirectionResponse } from '../../models/dashboard-direction.model';
import { StatsCardComponent } from '../stats-card/stats-card.component';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { AlertPanelComponent } from '../alert-panel/alert-panel.component';

@Component({
  selector: 'app-direction-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardComponent,
    ChartCardComponent,
    AlertPanelComponent,
  ],
  template: `
    <div class="stats-grid">
      <app-stats-card
        icon="groups"
        color="#006972"
        title="Effectif global"
        [value]="data.totalEmployees"
      />
      <app-stats-card
        icon="business"
        color="#006d37"
        title="Départements"
        [value]="data.totalDepartments"
      />
      <app-stats-card
        icon="assignment"
        color="#18b8c8"
        title="Contrats"
        [value]="data.totalContracts"
      />
    </div>

    <div class="charts-grid">
      <app-chart-card
        title="Évolution des effectifs"
        [labels]="data.employeeEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Effectifs', data: data.employeeEvolution.map(e => e.count), backgroundColor: '#006972' }]"
        type="line"
      />
      <app-chart-card
        title="Évolution des recrutements"
        [labels]="data.recruitmentEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Recrutements', data: data.recruitmentEvolution.map(e => e.count), backgroundColor: '#18b8c8' }]"
        type="line"
      />
      <app-chart-card
        title="Évolution des congés"
        [labels]="data.leaveEvolution.map(e => e.month)"
        [datasets]="[{ label: 'Congés', data: data.leaveEvolution.map(e => e.count), backgroundColor: '#16c067' }]"
        type="line"
      />
      <app-chart-card
        title="Répartition des contrats"
        [labels]="data.contractDistribution.map(c => c.type)"
        [datasets]="[{ label: 'Contrats', data: data.contractDistribution.map(c => c.count), backgroundColor: ['#006972', '#18b8c8', '#4ae183'] }]"
        type="doughnut"
      />
    </div>

    <app-alert-panel [alerts]="data.alerts" />
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
export class DirectionDashboardComponent {
  @Input({ required: true }) data!: DashboardDirectionResponse;
}