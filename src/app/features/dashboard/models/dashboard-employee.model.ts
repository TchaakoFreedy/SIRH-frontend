// src/app/features/dashboard/models/dashboard-employee.model.ts

import { Alert } from './alert.model';

export interface DashboardEmployeeResponse {
  leaveBalance: number;
  takenLeaves: number;
  pendingLeaves: number;
  currentContract: {
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  documents: {
    id: string;
    name: string;
    type: string;
    imageUrls: string[];
    uploadDate: string;
  }[];
  notifications: Alert[];

  // Indicateurs discipline, sanctions, performance
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  explanationRequestsEvolution: { month: string; count: number }[];
  sanctionsByType: { type: string; count: number }[];
  performanceEvolution: { month: string; averageScore: number }[];
}