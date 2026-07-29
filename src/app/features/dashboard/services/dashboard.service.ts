import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DashboardRHResponse } from '../models/dashboard-rh.model';
import { DashboardDirectionResponse } from '../models/dashboard-direction.model';
import { DashboardManagerResponse } from '../models/dashboard-manager.model';
import { DashboardEmployeeResponse } from '../models/dashboard-employee.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private baseUrl = '/api/dashboard';

  constructor(private http: HttpClient) {}

  getRhDashboard(): Observable<DashboardRHResponse> {
    return this.http.get<DashboardRHResponse>(`${this.baseUrl}/rh`).pipe(
      tap(response => console.log('✅ RH Dashboard reçu:', response)),
      catchError(this.handleError)
    );
  }

  getDirectionDashboard(): Observable<DashboardDirectionResponse> {
    return this.http.get<DashboardDirectionResponse>(`${this.baseUrl}/direction`).pipe(
      tap(response => console.log('✅ Direction Dashboard reçu:', response)),
      catchError(this.handleError)
    );
  }

  getManagerDashboard(): Observable<DashboardManagerResponse> {
    return this.http.get<DashboardManagerResponse>(`${this.baseUrl}/manager`).pipe(
      tap(response => console.log('✅ Manager Dashboard reçu:', response)),
      catchError(this.handleError)
    );
  }

  getEmployeeDashboard(): Observable<DashboardEmployeeResponse> {
    return this.http.get<DashboardEmployeeResponse>(`${this.baseUrl}/employee`).pipe(
      tap(response => console.log('✅ Employee Dashboard reçu:', response)),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('❌ DashboardService erreur:', error);
    return throwError(() => new Error('Impossible de charger les données du dashboard.'));
  }
}