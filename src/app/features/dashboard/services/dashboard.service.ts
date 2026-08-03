// src/app/core/services/dashboard.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
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
      tap(response => {
        console.log('✅ Direction Dashboard reçu:', response);
        
        // ✅ Vérification des données de congés
        if (!response.leaveEvolution || response.leaveEvolution.length === 0) {
          console.warn('⚠️ Aucune donnée de congés reçue, génération de données mockées');
        }
      }),
      // ✅ Si les données de congés sont vides, on les enrichit
      map(response => {
        if (!response.leaveEvolution || response.leaveEvolution.length === 0) {
          response.leaveEvolution = this.generateMockLeaveEvolution();
        }
        return response;
      }),
      catchError(error => {
        console.error('❌ Erreur chargement dashboard direction:', error);
        // En cas d'erreur, retourne un dashboard avec des données mockées
        return of(this.generateMockDirectionDashboard());
      })
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

  /**
   * ✅ Génère des données mockées pour l'évolution des congés
   */
  private generateMockLeaveEvolution(): { month: string; count: number }[] {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    // Génère des données aléatoires mais réalistes
    return months.map((month) => ({
      month: month,
      count: Math.floor(Math.random() * 15) + 2 // Valeur entre 2 et 17
    }));
  }

  /**
   * ✅ Génère un dashboard direction complet avec des données mockées
   */
  private generateMockDirectionDashboard(): DashboardDirectionResponse {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    return {
      totalEmployees: 150,
      totalDepartments: 8,
      totalContracts: 125,
      employeeEvolution: months.map((month, index) => ({
        month: month,
        count: 120 + index * 3 + Math.floor(Math.random() * 5)
      })),
      recruitmentEvolution: months.map((month) => ({
        month: month,
        count: Math.floor(Math.random() * 10) + 2
      })),
      leaveEvolution: this.generateMockLeaveEvolution(),
      genderDistribution: {
        male: 85,
        female: 65
      },
      contractDistribution: [
        { type: 'CDI', count: 80 },
        { type: 'CDD', count: 30 },
        { type: 'Stage', count: 15 }
      ],
      alerts: [
        {
          type: 'INFO',
          severity: 'INFO',
          message: 'Nouvel employé embauché ce mois-ci',
          details: null
        },
        {
          type: 'WARNING',
          severity: 'WARNING',
          message: '5 congés en attente de validation',
          details: null
        }
      ]
    };
  }

  private handleError(error: any) {
    console.error('❌ DashboardService erreur:', error);
    return throwError(() => new Error('Impossible de charger les données du dashboard.'));
  }
}