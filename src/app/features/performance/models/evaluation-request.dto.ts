// src/app/features/performance/models/evaluation-request.dto.ts

import { PeriodeEvaluation } from './periode-evaluation.enum';

export interface EvaluationRequestDTO {
  employeId: string;
  periode: PeriodeEvaluation;
  annee: number;
  commentaires?: string;
  
  // Pour les évaluations personnalisées
  typeEvaluation?: 'GLOBALE' | 'INDIVIDUELLE';
  critereIds?: string[];
  notesParCritere: { [key: string]: number };
}

export interface CreateEvaluationRequest {
  employeId: string;
  periode: PeriodeEvaluation;
  annee: number;
  commentaires?: string;
  notes: Array<{
    critereId: string;
    note: number;
  }>;
}

export interface UpdateEvaluationRequest {
  commentaires?: string;
  notes?: Array<{
    critereId: string;
    note: number;
  }>;
}

export interface EvaluationExistsRequest {
  employeId: string;
  periode: PeriodeEvaluation;
  annee: number;
}