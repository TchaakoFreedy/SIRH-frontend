// src/app/features/performance/services/performance.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CriterePerformance } from '../models/critere-performance.model';
import { EvaluationPerformance } from '../models/evaluation-performance.model';
import { ClassementDTO, DashboardPerformanceDTO } from '../models/classement.model';
import { EmployeeSelectionDTO } from '../models/employee-selection.dto';
import { PerformanceStats } from '../models/performance-stats.model';
import { EvolutionPoint } from '../models/evolution-point.model';
import { EvaluationFilterParams, buildEvaluationFilterParams } from '../models/performance-filter.model';
import { Page } from '../../../shared/models/page.model';
import { PeriodeEvaluation } from '../models/periode-evaluation.enum';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private baseUrl = `${environment.apiUrl}/performance`;

  constructor(private http: HttpClient) {}

  // ============================================
  // CRITÈRES DE PERFORMANCE
  // ============================================

  getCriteres(): Observable<CriterePerformance[]> {
    return this.http.get<CriterePerformance[]>(`${this.baseUrl}/criteres`);
  }

  getActiveCriteres(): Observable<CriterePerformance[]> {
    return this.http.get<CriterePerformance[]>(`${this.baseUrl}/criteres/active`);
  }

  getCritereById(id: string): Observable<CriterePerformance> {
    return this.http.get<CriterePerformance>(`${this.baseUrl}/criteres/${id}`);
  }

  createCritere(data: Partial<CriterePerformance>): Observable<CriterePerformance> {
    return this.http.post<CriterePerformance>(`${this.baseUrl}/criteres`, data);
  }

  updateCritere(id: string, data: Partial<CriterePerformance>): Observable<CriterePerformance> {
    return this.http.put<CriterePerformance>(`${this.baseUrl}/criteres/${id}`, data);
  }

  deleteCritere(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/criteres/${id}`);
  }

  // ============================================
  // CRITÈRES PAR EMPLOYÉ (GLOBAL + SELECTIVE)
  // ============================================

  getCriteresForEmployee(employeeId: string): Observable<CriterePerformance[]> {
    return this.http.get<CriterePerformance[]>(`${this.baseUrl}/criteres/employee/${employeeId}`);
  }

  getTypesCriteres(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/types-criteres`);
  }

  getEmployeesForSelection(): Observable<EmployeeSelectionDTO[]> {
    return this.http.get<EmployeeSelectionDTO[]>(`${this.baseUrl}/employees`);
  }

  getEmployeesWithSelectiveCriteres(): Observable<EmployeeSelectionDTO[]> {
    return this.http.get<EmployeeSelectionDTO[]>(`${this.baseUrl}/employees/with-selective-criteres`);
  }

  // ============================================
  // ÉVALUATIONS
  // ============================================

  getEvaluations(params?: EvaluationFilterParams): Observable<Page<EvaluationPerformance>> {
    let httpParams = new HttpParams();
    if (params) {
      const filterParams = buildEvaluationFilterParams(params);
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value);
        }
      });
    }
    return this.http.get<Page<EvaluationPerformance>>(`${this.baseUrl}/evaluations`, { params: httpParams });
  }

  getEvaluationById(id: string): Observable<EvaluationPerformance> {
    return this.http.get<EvaluationPerformance>(`${this.baseUrl}/evaluations/${id}`);
  }

  getEvaluationsByEmployee(employeeId: string, params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<EvaluationPerformance>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<EvaluationPerformance>>(
      `${this.baseUrl}/evaluations/employee/${employeeId}`, 
      { params: httpParams }
    );
  }

  getMyEvaluations(params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<EvaluationPerformance>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<EvaluationPerformance>>(`${this.baseUrl}/evaluations/my`, { params: httpParams });
  }

  getMyPerformanceStats(): Observable<PerformanceStats> {
    return this.http.get<PerformanceStats>(`${this.baseUrl}/evaluations/my/stats`);
  }

  getMyPerformanceEvolution(): Observable<EvolutionPoint[]> {
    return this.http.get<EvolutionPoint[]>(`${this.baseUrl}/evaluations/my/evolution`);
  }

  getMyRank(annee: number): Observable<ClassementDTO> {
    return this.http.get<ClassementDTO>(`${this.baseUrl}/classement/my-rank?annee=${annee}`);
  }

  // ✅ Mise à jour de createEvaluation pour accepter critereIds
  createEvaluation(data: {
    employeId: string;
    periode: PeriodeEvaluation;
    annee: number;
    mois?: number;
    commentaires?: string;
    notes: Array<{ critereId: string; note: number }>;
    critereIds?: string[];   // ✅ AJOUT
  }): Observable<EvaluationPerformance> {
    return this.http.post<EvaluationPerformance>(`${this.baseUrl}/evaluations`, data);
  }

  createEvaluationPersonnalisee(data: {
    employeId: string;
    periode: PeriodeEvaluation;
    annee: number;
    commentaires?: string;
    typeEvaluation: 'GLOBALE' | 'INDIVIDUELLE';
    critereIds?: string[];
    notesParCritere: { [key: string]: number };
  }): Observable<EvaluationPerformance> {
    return this.http.post<EvaluationPerformance>(`${this.baseUrl}/evaluations/personnalisee`, data);
  }

  updateEvaluation(id: string, data: {
    commentaires?: string;
    notes?: Array<{ critereId: string; note: number }>;
  }): Observable<EvaluationPerformance> {
    return this.http.put<EvaluationPerformance>(`${this.baseUrl}/evaluations/${id}`, data);
  }

  deleteEvaluation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/evaluations/${id}`);
  }

  checkExistingEvaluation(employeId: string, periode: PeriodeEvaluation, annee: number): Observable<boolean> {
    const params = new HttpParams()
      .set('employeId', employeId)
      .set('periode', periode)
      .set('annee', annee.toString());
    
    return this.http.get<boolean>(`${this.baseUrl}/evaluations/exists`, { params });
  }

  // ============================================
  // CLASSEMENT ET DASHBOARD
  // ============================================

  getClassement(annee: number, entrepriseId?: string, departementId?: string, top?: number): Observable<ClassementDTO[]> {
    let params = new HttpParams().set('annee', annee.toString());
    if (entrepriseId) params = params.set('entrepriseId', entrepriseId);
    if (departementId) params = params.set('departementId', departementId);
    if (top) params = params.set('top', top.toString());
    return this.http.get<ClassementDTO[]>(`${this.baseUrl}/classement`, { params });
  }

  getTopEmployes(annee: number, top: number = 10): Observable<ClassementDTO[]> {
    return this.http.get<ClassementDTO[]>(`${this.baseUrl}/classement/top/${top}?annee=${annee}`);
  }

  getDashboard(): Observable<DashboardPerformanceDTO> {
    return this.http.get<DashboardPerformanceDTO>(`${this.baseUrl}/dashboard`);
  }
}