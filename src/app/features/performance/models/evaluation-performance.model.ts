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
  commentaires?: string;
  dateEvaluation?: Date;
  notes: NoteEvaluation[];
  
  // ===== FIELDS =====
  typeEvaluation?: 'GLOBALE' | 'INDIVIDUELLE';
  criteresUtilises?: string[];  // IDs des critères utilisés pour traçabilité
  
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
}

// ============================================
// 📊 MENTION PERFORMANCE
// ============================================

export enum MentionPerformance {
  EXCELLENT = 'EXCELLENT',
  TRES_BIEN = 'TRES_BIEN',
  BIEN = 'BIEN',
  ASSEZ_BIEN = 'ASSEZ_BIEN',
  MOYEN = 'MOYEN',
  INSUFFISANT = 'INSUFFISANT'
}

export const MentionPerformanceLabels: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCELLENT]: '🌟 Excellent',
  [MentionPerformance.TRES_BIEN]: '⭐ Très Bien',
  [MentionPerformance.BIEN]: '✅ Bien',
  [MentionPerformance.ASSEZ_BIEN]: '👍 Assez Bien',
  [MentionPerformance.MOYEN]: '⚠️ Moyen',
  [MentionPerformance.INSUFFISANT]: '❌ Insuffisant'
};

export const MentionPerformanceColors: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCELLENT]: '#2e7d32',
  [MentionPerformance.TRES_BIEN]: '#1565c0',
  [MentionPerformance.BIEN]: '#00897b',
  [MentionPerformance.ASSEZ_BIEN]: '#4caf50',
  [MentionPerformance.MOYEN]: '#ffa000',
  [MentionPerformance.INSUFFISANT]: '#c62828'
};

export const MentionPerformanceIcons: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCELLENT]: 'emoji_events',
  [MentionPerformance.TRES_BIEN]: 'star',
  [MentionPerformance.BIEN]: 'check_circle',
  [MentionPerformance.ASSEZ_BIEN]: 'thumb_up',
  [MentionPerformance.MOYEN]: 'warning',
  [MentionPerformance.INSUFFISANT]: 'error'
};

export const MentionPerformanceBgColors: Record<MentionPerformance, string> = {
  [MentionPerformance.EXCELLENT]: 'bg-success',
  [MentionPerformance.TRES_BIEN]: 'bg-primary',
  [MentionPerformance.BIEN]: 'bg-info',
  [MentionPerformance.ASSEZ_BIEN]: 'bg-info',
  [MentionPerformance.MOYEN]: 'bg-warning',
  [MentionPerformance.INSUFFISANT]: 'bg-danger'
};

export function getMentionFromScore(score: number): MentionPerformance {
  if (score >= 90) return MentionPerformance.EXCELLENT;
  if (score >= 80) return MentionPerformance.TRES_BIEN;
  if (score >= 70) return MentionPerformance.BIEN;
  if (score >= 60) return MentionPerformance.ASSEZ_BIEN;
  if (score >= 50) return MentionPerformance.MOYEN;
  return MentionPerformance.INSUFFISANT;
}

export function getMentionLabel(mention: MentionPerformance): string {
  return MentionPerformanceLabels[mention] || mention;
}

export function getMentionColor(mention: MentionPerformance): string {
  return MentionPerformanceColors[mention] || '#666';
}

export function getMentionIcon(mention: MentionPerformance): string {
  return MentionPerformanceIcons[mention] || 'info';
}

export function getMentionBgColor(mention: MentionPerformance): string {
  return MentionPerformanceBgColors[mention] || 'bg-secondary';
}

// ============================================
// 📋 TYPE D'ÉVALUATION
// ============================================

export const TypeEvaluationOptions = [
  { value: 'GLOBALE', label: '🌍 Globale - Tous les critères' },
  { value: 'INDIVIDUELLE', label: '👤 Individuelle - Critères sélectionnés' }
];

export const TypeEvaluationLabels: Record<string, string> = {
  'GLOBALE': '🌍 Globale',
  'INDIVIDUELLE': '👤 Individuelle'
};