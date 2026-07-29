import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from './services/dashboard.service';
import { AuthService } from '../../services/auth.service'; // Chemin corrigé selon votre structure
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { DashboardLoadingComponent } from './components/dashboard-loading/dashboard-loading.component';
import { DashboardErrorComponent } from './components/dashboard-error/dashboard-error.component';
import { RhDashboardComponent } from './components/rh-dashboard/rh-dashboard.component';
import { DirectionDashboardComponent } from './components/direction-dashboard/direction-dashboard.component';
import { ManagerDashboardComponent } from './components/manager-dashboard/manager-dashboard.component';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard.component';
import {
  DashboardRHResponse,
  DashboardDirectionResponse,
  DashboardManagerResponse,
  DashboardEmployeeResponse,
} from './models';

export type DashboardData =
  | DashboardRHResponse
  | DashboardDirectionResponse
  | DashboardManagerResponse
  | DashboardEmployeeResponse;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    DashboardLoadingComponent,
    DashboardErrorComponent,
    RhDashboardComponent,
    DirectionDashboardComponent,
    ManagerDashboardComponent,
    EmployeeDashboardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  dashboardData = signal<DashboardData | null>(null);
  currentRole = signal<string>('');
  userName = signal<string>('');

  // Getters pour le template avec typage explicite
  get rhData(): DashboardRHResponse | null {
    const data = this.dashboardData();
    return data && (this.currentRole() === 'RH' || this.currentRole() === 'TOP_MANAGER')
      ? (data as DashboardRHResponse)
      : null;
  }

  get directionData(): DashboardDirectionResponse | null {
    const data = this.dashboardData();
    return data && this.currentRole() === 'DIRECTION'
      ? (data as DashboardDirectionResponse)
      : null;
  }

  get managerData(): DashboardManagerResponse | null {
    const data = this.dashboardData();
    return data && this.currentRole() === 'MANAGER'
      ? (data as DashboardManagerResponse)
      : null;
  }

  get employeeData(): DashboardEmployeeResponse | null {
    const data = this.dashboardData();
    return data && this.currentRole() === 'EMPLOYEE'
      ? (data as DashboardEmployeeResponse)
      : null;
  }

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    this.currentRole.set(role);
    this.userName.set(this.authService.getUserName());
    this.loadDashboard(role);
  }

  loadDashboard(role: string): void {
    this.loading.set(true);
    this.error.set(null);

    let request$: any;

    switch (role) {
      case 'RH':
      case 'TOP_MANAGER':
        request$ = this.dashboardService.getRhDashboard();
        break;
      case 'DIRECTION':
        request$ = this.dashboardService.getDirectionDashboard();
        break;
      case 'MANAGER':
        request$ = this.dashboardService.getManagerDashboard();
        break;
      case 'EMPLOYEE':
        request$ = this.dashboardService.getEmployeeDashboard();
        break;
      default:
        this.error.set('Rôle non reconnu');
        this.loading.set(false);
        return;
    }

    request$.subscribe({
      next: (data: DashboardData) => {
        this.dashboardData.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Impossible de charger les données du dashboard. Veuillez réessayer.');
        this.loading.set(false);
        console.error('Dashboard error', err);
      },
    });
  }
}