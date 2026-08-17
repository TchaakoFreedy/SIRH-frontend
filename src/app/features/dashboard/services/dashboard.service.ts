import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { DashboardRHResponse } from '../models/dashboard-rh.model';
import { DashboardDirectionResponse } from '../models/dashboard-direction.model';
import { DashboardManagerResponse } from '../models/dashboard-manager.model';
import { DashboardEmployeeResponse } from '../models/dashboard-employee.model';
import { AuthService } from '../../../services/auth.service';

import { DisciplineService } from '../../../features/discipline/services/discipline.service';
import { SanctionService } from '../../../features/discipline/services/sanction.service';
import { PerformanceService } from '../../../features/performance/services/performance.service';
import { StatutDemandeExplication } from '../../../features/discipline/models/demande-explication.model';
import { StatutSanction } from '../../../features/discipline/models/sanction.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private baseUrl = '/api/dashboard';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private disciplineService: DisciplineService,
    private sanctionService: SanctionService,
    private performanceService: PerformanceService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    let token = this.authService.getToken();
    if (!token) {
      token = localStorage.getItem('access_token') || 
              localStorage.getItem('token') || 
              localStorage.getItem('jwt');
    }
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    console.warn('DashboardService - Aucun token trouve');
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  private getManagerDepartementId(): string | null {
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.departementId || null;
      } catch (e) {
        console.warn('Impossible de parser l\'utilisateur courant');
      }
    }
    return null;
  }

  private getCurrentEmployeeId(): string | null {
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.id || null;
      } catch (e) {
        console.warn('Impossible de parser l\'utilisateur courant');
      }
    }
    return null;
  }

  private hasAnyRole(allowedRoles: string[]): boolean {
    const rolesStr = localStorage.getItem('roles');
    if (!rolesStr) return false;
    try {
      const roles = JSON.parse(rolesStr);
      return allowedRoles.some(role => roles.includes(role));
    } catch {
      return false;
    }
  }

  // ============================================================
  //  getRhDashboard
  // ============================================================
  getRhDashboard(): Observable<DashboardRHResponse> {
    const headers = this.getAuthHeaders();
    console.log('DashboardService - Chargement RH Dashboard avec donnees reelles');

    const rhData$ = this.http.get<DashboardRHResponse>(`${this.baseUrl}/rh`, { headers }).pipe(
      catchError(error => {
        console.error('Erreur chargement RH data:', error);
        return of({
          totalEmployees: 0,
          totalDepartments: 0,
          totalPositions: 0,
          activeContracts: 0,
          employeesOnLeaveToday: 0,
          pendingLeaveRequests: 0,
          contractsExpiringSoon: 0,
          missingDocuments: 0,
          genderDistribution: { male: 0, female: 0 },
          employeesByDepartment: [],
          contractDistribution: [],
          recruitmentEvolution: [],
          leaveEvolution: [],
          recentActivities: [],
          alerts: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardRHResponse);
      })
    );

    const pendingDE$ = this.disciplineService.getDemandes({
      statut: StatutDemandeExplication.EN_ATTENTE,
      size: 0,
      page: 0
    }).pipe(
      map(page => page.totalElements || 0),
      catchError(() => {
        console.warn('Impossible de charger les DE en attente, valeur 0');
        return of(0);
      })
    );

    const activeSanctions$ = this.sanctionService.getSanctions({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (page.content) {
          return page.content.filter(s => s.statut === StatutSanction.ACTIVE).length;
        }
        return 0;
      }),
      catchError(() => {
        console.warn('Erreur chargement sanctions actives, valeur 0');
        return of(0);
      })
    );

    const pendingEval$ = this.performanceService.getEvaluations({
      page: 0,
      size: 1000,
      statut: 'EN_ATTENTE'
    } as any).pipe(
      map(page => page.totalElements || 0),
      catchError(() => {
        console.warn('Impossible de charger les evaluations en attente, valeur 0');
        return of(0);
      })
    );

    const explanationEvolution$ = this.disciplineService.getDemandes({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }
        const monthMap = new Map<string, number>();
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

        page.content.forEach(demande => {
          if (demande.dateCreation) {
            const date = new Date(demande.dateCreation);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
          }
        });

        const result: { month: string; count: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const count = monthMap.get(key) || 0;
          result.push({
            month: months[d.getMonth()],
            count: count
          });
        }
        return result;
      }),
      catchError(() => {
        console.warn('Erreur chargement evolution des DE, tableau vide');
        return of([]);
      })
    );

    const sanctionsByType$ = this.sanctionService.getSanctions({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }
        const typeMap = new Map<string, number>();
        page.content.forEach(sanction => {
          const typeLabel = this.sanctionService.getTypeLabel(sanction.type);
          typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + 1);
        });
        return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
      }),
      catchError(() => {
        console.warn('Erreur chargement sanctions par type, tableau vide');
        return of([]);
      })
    );

    const performanceEvolution$ = this.performanceService.getEvaluations({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }

        const monthMap = new Map<string, { sum: number; count: number }>();
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

        page.content.forEach(evalItem => {
          if (evalItem.dateEvaluation) {
            const date = new Date(evalItem.dateEvaluation);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthMap.has(monthKey)) {
              monthMap.set(monthKey, { sum: 0, count: 0 });
            }
            const entry = monthMap.get(monthKey)!;

            let score = 0;
            if (evalItem.notes && evalItem.notes.length > 0) {
              const total = evalItem.notes.reduce((acc, n) => acc + n.note, 0);
              score = total / evalItem.notes.length;
            }
            entry.sum += score;
            entry.count += 1;
          }
        });

        const result: { month: string; averageScore: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const data = monthMap.get(key);
          const avg = data && data.count > 0 ? data.sum / data.count : 0;
          result.push({
            month: months[d.getMonth()],
            averageScore: Math.round(avg * 10) / 10
          });
        }
        return result;
      }),
      catchError(() => {
        console.warn('Erreur chargement evolution performance, tableau vide');
        return of([]);
      })
    );

    return forkJoin({
      rh: rhData$,
      pendingDE: pendingDE$,
      activeSanctions: activeSanctions$,
      pendingEval: pendingEval$,
      explanationEvolution: explanationEvolution$,
      sanctionsByType: sanctionsByType$,
      performanceEvolution: performanceEvolution$
    }).pipe(
      map(({ rh, pendingDE, activeSanctions, pendingEval, explanationEvolution, sanctionsByType, performanceEvolution }) => ({
        ...rh,
        pendingExplanationRequests: pendingDE,
        activeSanctions: activeSanctions,
        pendingEvaluations: pendingEval,
        explanationRequestsEvolution: explanationEvolution,
        sanctionsByType: sanctionsByType,
        performanceEvolution: performanceEvolution
      })),
      tap(finalData => console.log('Dashboard RH enrichi avec donnees reelles:', finalData)),
      catchError(error => {
        console.error('Erreur globale dashboard RH:', error);
        return of({
          totalEmployees: 0,
          totalDepartments: 0,
          totalPositions: 0,
          activeContracts: 0,
          employeesOnLeaveToday: 0,
          pendingLeaveRequests: 0,
          contractsExpiringSoon: 0,
          missingDocuments: 0,
          genderDistribution: { male: 0, female: 0 },
          employeesByDepartment: [],
          contractDistribution: [],
          recruitmentEvolution: [],
          leaveEvolution: [],
          recentActivities: [],
          alerts: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardRHResponse);
      })
    );
  }

  // ============================================================
  //  getDirectionDashboard
  // ============================================================
  getDirectionDashboard(): Observable<DashboardDirectionResponse> {
    const headers = this.getAuthHeaders();
    console.log('DashboardService - Chargement Direction Dashboard avec donnees reelles');

    const directionData$ = this.http.get<DashboardDirectionResponse>(`${this.baseUrl}/direction`, { headers }).pipe(
      catchError(error => {
        console.error('Erreur chargement direction data:', error);
        return of({
          totalEmployees: 0,
          totalDepartments: 0,
          totalContracts: 0,
          employeeEvolution: [],
          recruitmentEvolution: [],
          leaveEvolution: [],
          genderDistribution: { male: 0, female: 0 },
          contractDistribution: [],
          alerts: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardDirectionResponse);
      })
    );

    const pendingDE$ = this.disciplineService.getDemandes({
      statut: StatutDemandeExplication.EN_ATTENTE,
      size: 0,
      page: 0
    }).pipe(
      map(page => page.totalElements || 0),
      catchError(() => {
        console.warn('Direction - Impossible de charger les DE en attente, valeur 0');
        return of(0);
      })
    );

    const activeSanctions$ = this.sanctionService.getSanctions({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (page.content) {
          return page.content.filter(s => s.statut === StatutSanction.ACTIVE).length;
        }
        return 0;
      }),
      catchError(() => {
        console.warn('Direction - Erreur chargement sanctions actives, valeur 0');
        return of(0);
      })
    );

    const pendingEval$ = this.performanceService.getEvaluations({
      page: 0,
      size: 1000,
      statut: 'EN_ATTENTE'
    } as any).pipe(
      map(page => page.totalElements || 0),
      catchError(() => {
        console.warn('Direction - Impossible de charger les evaluations en attente, valeur 0');
        return of(0);
      })
    );

    const explanationEvolution$ = this.disciplineService.getDemandes({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }
        const monthMap = new Map<string, number>();
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

        page.content.forEach(demande => {
          if (demande.dateCreation) {
            const date = new Date(demande.dateCreation);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
          }
        });

        const result: { month: string; count: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const count = monthMap.get(key) || 0;
          result.push({
            month: months[d.getMonth()],
            count: count
          });
        }
        return result;
      }),
      catchError(() => {
        console.warn('Direction - Erreur chargement evolution des DE, tableau vide');
        return of([]);
      })
    );

    const sanctionsByType$ = this.sanctionService.getSanctions({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }
        const typeMap = new Map<string, number>();
        page.content.forEach(sanction => {
          const typeLabel = this.sanctionService.getTypeLabel(sanction.type);
          typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + 1);
        });
        return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
      }),
      catchError(() => {
        console.warn('Direction - Erreur chargement sanctions par type, tableau vide');
        return of([]);
      })
    );

    const performanceEvolution$ = this.performanceService.getEvaluations({
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }

        const monthMap = new Map<string, { sum: number; count: number }>();
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

        page.content.forEach(evalItem => {
          if (evalItem.dateEvaluation) {
            const date = new Date(evalItem.dateEvaluation);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthMap.has(monthKey)) {
              monthMap.set(monthKey, { sum: 0, count: 0 });
            }
            const entry = monthMap.get(monthKey)!;

            let score = 0;
            if (evalItem.notes && evalItem.notes.length > 0) {
              const total = evalItem.notes.reduce((acc, n) => acc + n.note, 0);
              score = total / evalItem.notes.length;
            }
            entry.sum += score;
            entry.count += 1;
          }
        });

        const result: { month: string; averageScore: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const data = monthMap.get(key);
          const avg = data && data.count > 0 ? data.sum / data.count : 0;
          result.push({
            month: months[d.getMonth()],
            averageScore: Math.round(avg * 10) / 10
          });
        }
        return result;
      }),
      catchError(() => {
        console.warn('Direction - Erreur chargement evolution performance, tableau vide');
        return of([]);
      })
    );

    return forkJoin({
      direction: directionData$,
      pendingDE: pendingDE$,
      activeSanctions: activeSanctions$,
      pendingEval: pendingEval$,
      explanationEvolution: explanationEvolution$,
      sanctionsByType: sanctionsByType$,
      performanceEvolution: performanceEvolution$
    }).pipe(
      map(({ direction, pendingDE, activeSanctions, pendingEval, explanationEvolution, sanctionsByType, performanceEvolution }) => ({
        ...direction,
        pendingExplanationRequests: pendingDE,
        activeSanctions: activeSanctions,
        pendingEvaluations: pendingEval,
        explanationRequestsEvolution: explanationEvolution,
        sanctionsByType: sanctionsByType,
        performanceEvolution: performanceEvolution
      })),
      tap(finalData => console.log('Direction Dashboard enrichi avec donnees reelles:', finalData)),
      catchError(error => {
        console.error('Erreur globale dashboard direction:', error);
        return of({
          totalEmployees: 0,
          totalDepartments: 0,
          totalContracts: 0,
          employeeEvolution: [],
          recruitmentEvolution: [],
          leaveEvolution: [],
          genderDistribution: { male: 0, female: 0 },
          contractDistribution: [],
          alerts: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardDirectionResponse);
      })
    );
  }

  // ============================================================
  //  getManagerDashboard (avec filtrage conditionnel selon les rôles)
  // ============================================================
  getManagerDashboard(): Observable<DashboardManagerResponse> {
    const headers = this.getAuthHeaders();
    const departementId = this.getManagerDepartementId();
    console.log('DashboardService - Chargement Manager Dashboard pour departement:', departementId);

    let params = new HttpParams();
    if (departementId) {
      params = params.set('departementId', departementId);
    }

    const managerData$ = this.http.get<DashboardManagerResponse>(`${this.baseUrl}/manager`, {
      headers,
      params
    }).pipe(
      catchError(error => {
        console.error('Erreur chargement manager data:', error);
        return of({
          teamSize: 0,
          employeesAbsentToday: 0,
          pendingApprovals: 0,
          presenceRate: 0,
          positionsDistribution: [],
          leaveEvolution: [],
          recentActivities: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardManagerResponse);
      })
    );

    const pendingDE$ = this.disciplineService.getDemandes({
      statut: StatutDemandeExplication.EN_ATTENTE,
      size: 0,
      page: 0,
      departementId: departementId || undefined
    } as any).pipe(
      map(page => page.totalElements || 0),
      catchError(() => {
        console.warn('Manager - Impossible de charger les DE en attente, valeur 0');
        return of(0);
      })
    );

    const explanationEvolution$ = this.disciplineService.getDemandes({
      page: 0,
      size: 1000,
      departementId: departementId || undefined
    } as any).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }
        const monthMap = new Map<string, number>();
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
        page.content.forEach(demande => {
          if (demande.dateCreation) {
            const date = new Date(demande.dateCreation);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
          }
        });
        const result: { month: string; count: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const count = monthMap.get(key) || 0;
          result.push({
            month: months[d.getMonth()],
            count: count
          });
        }
        return result;
      }),
      catchError(() => {
        console.warn('Manager - Erreur chargement evolution des DE, tableau vide');
        return of([]);
      })
    );

    const allowedRoles = ['ROLE_RH', 'ROLE_ADMIN', 'ROLE_DIRECTION'];
    const canAccessSanctionsAndPerformance = this.hasAnyRole(allowedRoles);

    const activeSanctions$ = canAccessSanctionsAndPerformance
      ? this.sanctionService.getSanctions({
          page: 0,
          size: 1000,
          departementId: departementId || undefined
        } as any).pipe(
          map(page => {
            if (page.content) {
              return page.content.filter(s => s.statut === StatutSanction.ACTIVE).length;
            }
            return 0;
          }),
          catchError(() => {
            console.warn('Manager - Erreur chargement sanctions actives, valeur 0');
            return of(0);
          })
        )
      : of(0);

    const sanctionsByType$ = canAccessSanctionsAndPerformance
      ? this.sanctionService.getSanctions({
          page: 0,
          size: 1000,
          departementId: departementId || undefined
        } as any).pipe(
          map(page => {
            if (!page.content || page.content.length === 0) {
              return [];
            }
            const typeMap = new Map<string, number>();
            page.content.forEach(sanction => {
              const typeLabel = this.sanctionService.getTypeLabel(sanction.type);
              typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + 1);
            });
            return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
          }),
          catchError(() => {
            console.warn('Manager - Erreur chargement sanctions par type, tableau vide');
            return of([]);
          })
        )
      : of([]);

    const pendingEval$ = canAccessSanctionsAndPerformance
      ? this.performanceService.getEvaluations({
          page: 0,
          size: 1000,
          statut: 'EN_ATTENTE',
          departementId: departementId || undefined
        } as any).pipe(
          map(page => page.totalElements || 0),
          catchError(() => {
            console.warn('Manager - Impossible de charger les evaluations en attente, valeur 0');
            return of(0);
          })
        )
      : of(0);

    const performanceEvolution$ = canAccessSanctionsAndPerformance
      ? this.performanceService.getEvaluations({
          page: 0,
          size: 1000,
          departementId: departementId || undefined
        } as any).pipe(
          map(page => {
            if (!page.content || page.content.length === 0) {
              return [];
            }
            const monthMap = new Map<string, { sum: number; count: number }>();
            const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
            page.content.forEach(evalItem => {
              if (evalItem.dateEvaluation) {
                const date = new Date(evalItem.dateEvaluation);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (!monthMap.has(monthKey)) {
                  monthMap.set(monthKey, { sum: 0, count: 0 });
                }
                const entry = monthMap.get(monthKey)!;
                let score = 0;
                if (evalItem.notes && evalItem.notes.length > 0) {
                  const total = evalItem.notes.reduce((acc, n) => acc + n.note, 0);
                  score = total / evalItem.notes.length;
                }
                entry.sum += score;
                entry.count += 1;
              }
            });
            const result: { month: string; averageScore: number }[] = [];
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const key = `${d.getFullYear()}-${d.getMonth()}`;
              const data = monthMap.get(key);
              const avg = data && data.count > 0 ? data.sum / data.count : 0;
              result.push({
                month: months[d.getMonth()],
                averageScore: Math.round(avg * 10) / 10
              });
            }
            return result;
          }),
          catchError(() => {
            console.warn('Manager - Erreur chargement evolution performance, tableau vide');
            return of([]);
          })
        )
      : of([]);

    return forkJoin({
      manager: managerData$,
      pendingDE: pendingDE$,
      activeSanctions: activeSanctions$,
      pendingEval: pendingEval$,
      explanationEvolution: explanationEvolution$,
      sanctionsByType: sanctionsByType$,
      performanceEvolution: performanceEvolution$
    }).pipe(
      map(({ manager, pendingDE, activeSanctions, pendingEval, explanationEvolution, sanctionsByType, performanceEvolution }) => ({
        ...manager,
        pendingExplanationRequests: pendingDE,
        activeSanctions: activeSanctions,
        pendingEvaluations: pendingEval,
        explanationRequestsEvolution: explanationEvolution,
        sanctionsByType: sanctionsByType,
        performanceEvolution: performanceEvolution
      })),
      tap(finalData => console.log('Manager Dashboard enrichi avec donnees reelles:', finalData)),
      catchError(error => {
        console.error('Erreur globale dashboard manager:', error);
        return of({
          teamSize: 0,
          employeesAbsentToday: 0,
          pendingApprovals: 0,
          presenceRate: 0,
          positionsDistribution: [],
          leaveEvolution: [],
          recentActivities: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardManagerResponse);
      })
    );
  }

  // ============================================================
  //  getEmployeeDashboard (enrichi avec données personnelles)
  //  Les appels à discipline et sanctions sont conditionnés par les rôles
  // ============================================================
  getEmployeeDashboard(): Observable<DashboardEmployeeResponse> {
    const headers = this.getAuthHeaders();
    const employeeId = this.getCurrentEmployeeId();
    console.log('DashboardService - Chargement Employee Dashboard pour employe:', employeeId);

    const employeeData$ = this.http.get<DashboardEmployeeResponse>(`${this.baseUrl}/employee`, { headers }).pipe(
      catchError(error => {
        console.error('Erreur chargement employee data:', error);
        return of({
          leaveBalance: 0,
          takenLeaves: 0,
          pendingLeaves: 0,
          currentContract: null,
          documents: [],
          notifications: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardEmployeeResponse);
      })
    );

    if (!employeeId) {
      console.warn('Aucun ID employé trouvé, les données de discipline/sanction/performance ne seront pas chargées.');
      return employeeData$.pipe(
        map(data => ({
          ...data,
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        }))
      );
    }

    // Déterminer si l'utilisateur a le droit d'accéder aux données de discipline et sanctions
    const disciplineRoles = ['ROLE_RH', 'ROLE_ADMIN', 'ROLE_DIRECTION', 'ROLE_MANAGER'];
    const canAccessDiscipline = this.hasAnyRole(disciplineRoles);

    // ---- Demandes d'explication (conditionnées) ----
    const pendingDE$ = canAccessDiscipline
      ? this.disciplineService.getDemandes({
          statut: StatutDemandeExplication.EN_ATTENTE,
          size: 0,
          page: 0,
          employeId: employeeId
        }).pipe(
          map(page => page.totalElements || 0),
          catchError(() => {
            console.warn('Employee - Impossible de charger les DE en attente, valeur 0');
            return of(0);
          })
        )
      : of(0);

    const explanationEvolution$ = canAccessDiscipline
      ? this.disciplineService.getDemandes({
          page: 0,
          size: 1000,
          employeId: employeeId
        }).pipe(
          map(page => {
            if (!page.content || page.content.length === 0) {
              return [];
            }
            const monthMap = new Map<string, number>();
            const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
            page.content.forEach(demande => {
              if (demande.dateCreation) {
                const date = new Date(demande.dateCreation);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
              }
            });
            const result: { month: string; count: number }[] = [];
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const key = `${d.getFullYear()}-${d.getMonth()}`;
              const count = monthMap.get(key) || 0;
              result.push({
                month: months[d.getMonth()],
                count: count
              });
            }
            return result;
          }),
          catchError(() => {
            console.warn('Employee - Erreur chargement evolution des DE, tableau vide');
            return of([]);
          })
        )
      : of([]);

    // ---- Sanctions (conditionnées) ----
    const activeSanctions$ = canAccessDiscipline
      ? this.sanctionService.getSanctions({
          page: 0,
          size: 1000,
          employeId: employeeId
        } as any).pipe(
          map(page => {
            if (page.content) {
              return page.content.filter(s => s.statut === StatutSanction.ACTIVE).length;
            }
            return 0;
          }),
          catchError(() => {
            console.warn('Employee - Erreur chargement sanctions actives, valeur 0');
            return of(0);
          })
        )
      : of(0);

    const sanctionsByType$ = canAccessDiscipline
      ? this.sanctionService.getSanctions({
          page: 0,
          size: 1000,
          employeId: employeeId
        } as any).pipe(
          map(page => {
            if (!page.content || page.content.length === 0) {
              return [];
            }
            const typeMap = new Map<string, number>();
            page.content.forEach(sanction => {
              const typeLabel = this.sanctionService.getTypeLabel(sanction.type);
              typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + 1);
            });
            return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
          }),
          catchError(() => {
            console.warn('Employee - Erreur chargement sanctions par type, tableau vide');
            return of([]);
          })
        )
      : of([]);

    // ---- Évaluations (toujours accessibles pour l'employé) ----
    const pendingEval$ = this.performanceService.getEvaluationsByEmployee(employeeId, {
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (page.content) {
          return page.content.filter(e => !e.dateEvaluation).length;
        }
        return 0;
      }),
      catchError(() => {
        console.warn('Employee - Impossible de charger les evaluations en attente, valeur 0');
        return of(0);
      })
    );

    const performanceEvolution$ = this.performanceService.getEvaluationsByEmployee(employeeId, {
      page: 0,
      size: 1000
    }).pipe(
      map(page => {
        if (!page.content || page.content.length === 0) {
          return [];
        }
        const monthMap = new Map<string, { sum: number; count: number }>();
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
        page.content.forEach(evalItem => {
          if (evalItem.dateEvaluation) {
            const date = new Date(evalItem.dateEvaluation);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthMap.has(monthKey)) {
              monthMap.set(monthKey, { sum: 0, count: 0 });
            }
            const entry = monthMap.get(monthKey)!;
            let score = 0;
            if (evalItem.notes && evalItem.notes.length > 0) {
              const total = evalItem.notes.reduce((acc, n) => acc + n.note, 0);
              score = total / evalItem.notes.length;
            }
            entry.sum += score;
            entry.count += 1;
          }
        });
        const result: { month: string; averageScore: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const data = monthMap.get(key);
          const avg = data && data.count > 0 ? data.sum / data.count : 0;
          result.push({
            month: months[d.getMonth()],
            averageScore: Math.round(avg * 10) / 10
          });
        }
        return result;
      }),
      catchError(() => {
        console.warn('Employee - Erreur chargement evolution performance, tableau vide');
        return of([]);
      })
    );

    return forkJoin({
      employee: employeeData$,
      pendingDE: pendingDE$,
      activeSanctions: activeSanctions$,
      pendingEval: pendingEval$,
      explanationEvolution: explanationEvolution$,
      sanctionsByType: sanctionsByType$,
      performanceEvolution: performanceEvolution$
    }).pipe(
      map(({ employee, pendingDE, activeSanctions, pendingEval, explanationEvolution, sanctionsByType, performanceEvolution }) => ({
        ...employee,
        pendingExplanationRequests: pendingDE,
        activeSanctions: activeSanctions,
        pendingEvaluations: pendingEval,
        explanationRequestsEvolution: explanationEvolution,
        sanctionsByType: sanctionsByType,
        performanceEvolution: performanceEvolution
      })),
      tap(finalData => console.log('Employee Dashboard enrichi avec donnees reelles:', finalData)),
      catchError(error => {
        console.error('Erreur globale dashboard employee:', error);
        return of({
          leaveBalance: 0,
          takenLeaves: 0,
          pendingLeaves: 0,
          currentContract: null,
          documents: [],
          notifications: [],
          pendingExplanationRequests: 0,
          activeSanctions: 0,
          pendingEvaluations: 0,
          explanationRequestsEvolution: [],
          sanctionsByType: [],
          performanceEvolution: []
        } as DashboardEmployeeResponse);
      })
    );
  }

  // ============================================================
  //  Gestion des erreurs
  // ============================================================
  private handleError(error: any): Observable<never> {
    console.error('DashboardService erreur:', error);
    if (error.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('jwt');
      localStorage.removeItem('refresh_token');
      return throwError(() => new Error('Session expiree. Veuillez vous reconnecter.'));
    }
    if (error.status === 403) {
      return throwError(() => new Error('Vous n\'avez pas les permissions necessaires.'));
    }
    return throwError(() => new Error('Impossible de charger les donnees du dashboard.'));
  }
}