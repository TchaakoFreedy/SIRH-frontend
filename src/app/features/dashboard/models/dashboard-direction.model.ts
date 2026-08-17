export interface DashboardDirectionResponse {
  totalEmployees: number;
  totalDepartments: number;
  totalContracts: number;
  employeeEvolution: { month: string; count: number }[];
  recruitmentEvolution: { month: string; count: number }[];
  leaveEvolution: { month: string; count: number }[];
  genderDistribution: {
    male: number;
    female: number;
  };
  contractDistribution: {
    type: string;
    count: number;
  }[];
  alerts: {
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    details: any;
  }[];
  
  // Nouveaux indicateurs pour discipline, sanctions et performance (périmètre direction)
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  explanationRequestsEvolution: { month: string; count: number }[];
  sanctionsByType: { type: string; count: number }[];
  performanceEvolution: { month: string; averageScore: number }[];
}