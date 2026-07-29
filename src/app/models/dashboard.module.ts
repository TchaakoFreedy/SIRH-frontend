import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  suspendedEmployees: number;
  totalDepartments: number;
  totalContracts: number;
  activeContracts: number;
  pendingDocuments: number;
  expiringContracts: number;
}

export interface DepartmentDistribution {
  name: string;
  count: number;
  color: string;
}

export interface ContractTypeStats {
  type: string;
  count: number;
}

export interface RecentEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  status: string;
  contractType: string;
  hireDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<{
    stats: DashboardStats;
    departmentDistribution: DepartmentDistribution[];
    contractTypeStats: ContractTypeStats[];
    recentEmployees: RecentEmployee[];
  }> {
    // Récupération des données réelles via plusieurs appels API
    return forkJoin({
      employees: this.http.get<any[]>(`${this.apiUrl}/employees`).pipe(catchError(() => of([]))),
      departments: this.http.get<any[]>(`${this.apiUrl}/departements`).pipe(catchError(() => of([]))),
      contracts: this.http.get<any[]>(`${this.apiUrl}/contracts`).pipe(catchError(() => of([]))),
      documents: this.http.get<any[]>(`${this.apiUrl}/documents`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ employees, departments, contracts, documents }) => {
        // Si toutes les données sont vides, retourner les données de démonstration
        if (employees.length === 0 && departments.length === 0 && contracts.length === 0) {
          return this.getDemoData();
        }

        // Calcul des statistiques
        const stats: DashboardStats = {
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e: any) => e.status === 'ACTIVE').length,
          suspendedEmployees: employees.filter((e: any) => e.status === 'SUSPENDED').length,
          totalDepartments: departments.length,
          totalContracts: contracts.length,
          activeContracts: contracts.filter((c: any) => c.status === 'ACTIVE').length,
          pendingDocuments: documents.filter((d: any) => d.status === 'PENDING').length,
          expiringContracts: contracts.filter((c: any) => {
            if (!c.endDate) return false;
            const endDate = new Date(c.endDate);
            const now = new Date();
            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays > 0;
          }).length
        };

        // Distribution par département
        const departmentCount: {[key: string]: number} = {};
        employees.forEach((emp: any) => {
          const dept = emp.department || 'Non défini';
          departmentCount[dept] = (departmentCount[dept] || 0) + 1;
        });
        const departmentDistribution = Object.entries(departmentCount).map(([name, count]) => ({
          name,
          count,
          color: this.getDepartmentColor(name)
        }));

        // Statistiques par type de contrat
        const contractTypes: {[key: string]: number} = {};
        contracts.forEach((contract: any) => {
          const type = contract.type || 'Autre';
          contractTypes[type] = (contractTypes[type] || 0) + 1;
        });
        const contractTypeStats = Object.entries(contractTypes).map(([type, count]) => ({
          type,
          count
        }));

        // Derniers employés
        const recentEmployees = employees
          .sort((a: any, b: any) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime())
          .slice(0, 5)
          .map((emp: any) => ({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            department: emp.department || 'Non défini',
            status: emp.status,
            contractType: emp.currentContract?.type || 'N/A',
            hireDate: emp.hireDate
          }));

        return {
          stats,
          departmentDistribution,
          contractTypeStats,
          recentEmployees
        };
      }),
      catchError((error: any) => {
        console.error('Erreur chargement dashboard:', error);
        // Retourner des données de démonstration en cas d'erreur
        return of(this.getDemoData());
      })
    );
  }

  private getDepartmentColor(name: string): string {
    const colors: {[key: string]: string} = {
      'Informatique': '#4CAF50',
      'RH': '#2196F3',
      'Marketing': '#FF9800',
      'Finance': '#9C27B0',
      'Commercial': '#F44336',
      'Logistique': '#00BCD4',
      'Direction': '#607D8B',
      'Qualité': '#8BC34A',
      'R&D': '#E91E63'
    };
    return colors[name] || '#795548';
  }

  private getDemoData(): {
    stats: DashboardStats;
    departmentDistribution: DepartmentDistribution[];
    contractTypeStats: ContractTypeStats[];
    recentEmployees: RecentEmployee[];
  } {
    return {
      stats: {
        totalEmployees: 45,
        activeEmployees: 38,
        suspendedEmployees: 3,
        totalDepartments: 6,
        totalContracts: 45,
        activeContracts: 38,
        pendingDocuments: 12,
        expiringContracts: 4
      },
      departmentDistribution: [
        { name: 'Informatique', count: 12, color: '#4CAF50' },
        { name: 'RH', count: 8, color: '#2196F3' },
        { name: 'Marketing', count: 7, color: '#FF9800' },
        { name: 'Finance', count: 6, color: '#9C27B0' },
        { name: 'Commercial', count: 9, color: '#F44336' },
        { name: 'Logistique', count: 3, color: '#00BCD4' }
      ],
      contractTypeStats: [
        { type: 'CDI', count: 25 },
        { type: 'CDD', count: 8 },
        { type: 'Stage', count: 7 },
        { type: 'Alternance', count: 5 }
      ],
      recentEmployees: [
        {
          id: '1',
          firstName: 'Marie',
          lastName: 'Dupont',
          email: 'marie.dupont@entreprise.com',
          department: 'Informatique',
          status: 'ACTIVE',
          contractType: 'CDI',
          hireDate: '2025-01-15'
        },
        {
          id: '2',
          firstName: 'Jean',
          lastName: 'Martin',
          email: 'jean.martin@entreprise.com',
          department: 'Marketing',
          status: 'ACTIVE',
          contractType: 'CDD',
          hireDate: '2025-01-10'
        },
        {
          id: '3',
          firstName: 'Sophie',
          lastName: 'Bernard',
          email: 'sophie.bernard@entreprise.com',
          department: 'Finance',
          status: 'SUSPENDED',
          contractType: 'CDI',
          hireDate: '2025-01-05'
        },
        {
          id: '4',
          firstName: 'Thomas',
          lastName: 'Petit',
          email: 'thomas.petit@entreprise.com',
          department: 'Commercial',
          status: 'ACTIVE',
          contractType: 'Stage',
          hireDate: '2025-01-20'
        },
        {
          id: '5',
          firstName: 'Laura',
          lastName: 'Dubois',
          email: 'laura.dubois@entreprise.com',
          department: 'RH',
          status: 'ACTIVE',
          contractType: 'CDI',
          hireDate: '2025-01-25'
        }
      ]
    };
  }
}