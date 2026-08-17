// src/app/features/performance/models/performance-stats.model.ts

import { MentionPerformance } from './evaluation-performance.model';
import { ClassementDTO } from './classement.model';
import { EvolutionPoint } from './evolution-point.model';

export interface EmployeePerformanceStats {
  employeeId: string;
  employeeName: string;
  totalEvaluations: number;
  moyenneGenerale: number;
  meilleureNote: number;
  derniereEvaluation?: Date;
  mention?: string;
  evolution: EvolutionPoint[];
  criteresFort: string[];
  criteresFaible: string[];
}

export interface PerformanceStats {
  totalEvaluations: number;
  moyenneGenerale: number;
  parPeriode: {
    periode: string;
    count: number;
    moyenne: number;
  }[];
  parMention: {
    mention: MentionPerformance;
    libelle: string;
    count: number;
    pourcentage: number;
  }[];
  evolution: EvolutionPoint[];
}

export interface DepartmentPerformanceStats {
  departementId: string;
  departementNom: string;
  totalEmployees: number;
  evaluatedEmployees: number;
  moyenneGenerale: number;
  topEmployees: ClassementDTO[];
  mentionDistribution: Record<string, number>;
}