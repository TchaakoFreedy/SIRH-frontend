// src/app/features/performance/models/evolution-point.model.ts

export interface EvolutionPoint {
  date: Date;
  score: number;
  mention: string;
  periode: string;
  annee: number;
  mois?: string;
  trimestre?: number;
  semestre?: number;
}