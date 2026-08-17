// src/app/features/performance/models/classement.model.ts

import { MentionPerformance } from './evaluation-performance.model';

export interface ClassementDTO {
  employeId: string;
  employeNom: string;
  entrepriseId?: string;
  entrepriseNom?: string;
  departementId?: string;
  departementNom?: string;
  scoreTotal: number;
  annee: number;
  rang: number;
  mention?: string;
  totalEmployes?: number;
}

export interface DashboardPerformanceDTO {
  totalEvaluations: number;
  moyenneGenerale: number;
  meilleurEmploye?: ClassementDTO;
  meilleurDepartement?: string;
  repartitionMentions: Record<string, number>;
  evolutionParMois: EvolutionPerformanceDTO[];
}

export interface EvolutionPerformanceDTO {
  mois: string;
  annee: number;
  moyenne: number;
  nombreEvaluations: number;
}

export interface MentionDistributionDTO {
  mention: string;
  libelle: string;
  count: number;
  pourcentage: number;
}

export interface RankDTO {
  employeeId: string;
  employeeName: string;
  rang: number;
  totalEmployes: number;
  scoreTotal: number;
  annee: number;
}

// ============================================
// 📊 CLASSEMENT FILTERS
// ============================================

export interface ClassementFilter {
  annee: number;
  entrepriseId?: string;
  departementId?: string;
  top?: number;
}

export const DefaultClassementFilter: ClassementFilter = {
  annee: new Date().getFullYear(),
  top: 10
};