// src/app/features/performance/models/performance-filter.model.ts

import { PeriodeEvaluation } from './periode-evaluation.enum';

export interface PerformanceFilter {
  annee?: number;
  periode?: PeriodeEvaluation;
  employeId?: string;
  departementId?: string;
  entrepriseId?: string;
  typeEvaluation?: 'GLOBALE' | 'INDIVIDUELLE';
  mention?: string;
  dateDebut?: Date;
  dateFin?: Date;
}

export interface EvaluationFilterParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  employeId?: string;
  departementId?: string;
  entrepriseId?: string;
  periode?: PeriodeEvaluation;
  annee?: number;
  typeEvaluation?: 'GLOBALE' | 'INDIVIDUELLE';
  mention?: string;
}

export function buildEvaluationFilterParams(filter: EvaluationFilterParams): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  
  if (filter.page !== undefined) params['page'] = filter.page.toString();
  if (filter.size !== undefined) params['size'] = filter.size.toString();
  if (filter.sort) params['sort'] = filter.sort;
  if (filter.direction) params['direction'] = filter.direction;
  if (filter.employeId) params['employeId'] = filter.employeId;
  if (filter.departementId) params['departementId'] = filter.departementId;
  if (filter.entrepriseId) params['entrepriseId'] = filter.entrepriseId;
  if (filter.periode) params['periode'] = filter.periode;
  if (filter.annee) params['annee'] = filter.annee.toString();
  if (filter.typeEvaluation) params['typeEvaluation'] = filter.typeEvaluation;
  if (filter.mention) params['mention'] = filter.mention;
  
  return params;
}