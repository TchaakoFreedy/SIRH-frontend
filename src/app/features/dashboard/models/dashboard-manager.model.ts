// src/app/features/dashboard/models/dashboard-manager.model.ts

import { Alert } from './alert.model';

export interface DashboardManagerResponse {
  teamSize: number;
  employeesAbsentToday: number;
  pendingApprovals: number;
  presenceRate: number;
  positionsDistribution: {
    positionName: string;
    count: number;
  }[];
  leaveEvolution: {
    month: string;
    count: number;
  }[];
  recentActivities: {
    date: string;
    type: string;
    description: string;
    employeeName: string;
  }[];
  alerts?: Alert[]; // optionnel

  // Indicateurs discipline, sanctions, performance
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  explanationRequestsEvolution: { month: string; count: number }[];
  sanctionsByType: { type: string; count: number }[];
  performanceEvolution: { month: string; averageScore: number }[];
}