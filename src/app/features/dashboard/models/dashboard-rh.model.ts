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
  alerts: {
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    details: any;
  }[];
  
  // Nouveaux indicateurs pour discipline, sanctions et performance
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  
  // Données pour les graphiques supplémentaires
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