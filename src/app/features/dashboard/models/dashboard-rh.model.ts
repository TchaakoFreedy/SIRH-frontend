// src/app/features/dashboard/models/dashboard-rh.model.ts

import { Alert } from './alert.model';

export interface DashboardRHResponse {
  totalEmployees: number;
  totalDepartments: number;
  totalPositions: number;
  activeContracts: number;
  employeesOnLeaveToday: number;
  pendingLeaveRequests: number;
  contractsExpiringSoon: number;
  missingDocuments: number;
  genderDistribution: {
    male: number;
    female: number;
  };
  employeesByDepartment: {
    departmentName: string;
    count: number;
  }[];
  contractDistribution: {
    type: string;
    count: number;
  }[];
  recruitmentEvolution: {
    month: string;
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
  alerts: Alert[];

  // Indicateurs discipline, sanctions, performance
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  explanationRequestsEvolution: {
    month: string;
    count: number;
  }[];
  sanctionsByType: {
    type: string;
    count: number;
  }[];
  performanceEvolution: {
    month: string;
    averageScore: number;
  }[];
}