// src/app/features/performance/models/evaluation-performance.model.ts

import { PeriodeEvaluation } from './periode-evaluation.enum';

export interface EvaluationPerformance {
  id?: string;
  employeId: string;
  employeNom?: string;
  evaluateurId?: string;
  evaluateurNom?: string;
  periode: PeriodeEvaluation;
  annee: number;
  mois?: number;
  commentaires?: string;
  dateEvaluation?: Date;
  notes: NoteEvaluation[];
  
  typeEvaluation?: 'GLOBALE' | 'INDIVIDUELLE';
  criteresUtilises?: string[];
  
  totalObtenu?: number;
  totalMaximal?: number;
  pourcentage?: number;
  mention?: string;
  
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface NoteEvaluation {
  critereId: string;
  critereNom?: string;
  note: number;
  coefficient?: number;
  scorePondere?: number;
  noteMaximale?: number;  // ✅ AJOUT
}

// ============================================
// MENTION PERFORMANCE
// ============================================

export enum MentionPerformance {
  EXCEPTIONNEL = 'EXCEPTIONNEL',
  TRES_BIEN = 'TRES_BIEN',
  BIEN = 'BIEN',
  ASSEZ_BIEN = 'ASSEZ_BIEN',
  MOYEN = 'MOYEN',
  INSUFFISANT = 'INSUFFISANT'
}

export const MentionPerformanceLabels: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCEPTIONNEL]: 'Exceptionnel',
  [MentionPerformance.TRES_BIEN]: 'Très Bien',
  [MentionPerformance.BIEN]: 'Bien',
  [MentionPerformance.ASSEZ_BIEN]: 'Assez Bien',
  [MentionPerformance.MOYEN]: 'Moyen',
  [MentionPerformance.INSUFFISANT]: 'Insuffisant'
};

export const MentionPerformanceColors: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCEPTIONNEL]: '#10b981',
  [MentionPerformance.TRES_BIEN]: '#3b82f6',
  [MentionPerformance.BIEN]: '#06b6d4',
  [MentionPerformance.ASSEZ_BIEN]: '#8b5cf6',
  [MentionPerformance.MOYEN]: '#f59e0b',
  [MentionPerformance.INSUFFISANT]: '#ef4444'
};

export const MentionPerformanceIcons: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCEPTIONNEL]: 'emoji_events',
  [MentionPerformance.TRES_BIEN]: 'star',
  [MentionPerformance.BIEN]: 'check_circle',
  [MentionPerformance.ASSEZ_BIEN]: 'thumb_up',
  [MentionPerformance.MOYEN]: 'warning',
  [MentionPerformance.INSUFFISANT]: 'error'
};

export function getMentionFromScore(score: number): MentionPerformance {
  if (score >= 90) return MentionPerformance.EXCEPTIONNEL;
  if (score >= 80) return MentionPerformance.TRES_BIEN;
  if (score >= 70) return MentionPerformance.BIEN;
  if (score >= 60) return MentionPerformance.ASSEZ_BIEN;
  if (score >= 50) return MentionPerformance.MOYEN;
  return MentionPerformance.INSUFFISANT;
}

export function getMentionLabel(mention: string): string {
  const key = mention as MentionPerformance;
  return MentionPerformanceLabels[key] || mention;
}

export function getMentionColor(mention: string): string {
  const key = mention as MentionPerformance;
  return MentionPerformanceColors[key] || '#6c757d';
}

export const TypeEvaluationOptions = [
  { value: 'GLOBALE', label: 'Globale - Tous les critères' },
  { value: 'INDIVIDUELLE', label: 'Individuelle - Critères sélectionnés' }
];

export const TypeEvaluationLabels: Record<string, string> = {
  'GLOBALE': 'Globale',
  'INDIVIDUELLE': 'Individuelle'
};