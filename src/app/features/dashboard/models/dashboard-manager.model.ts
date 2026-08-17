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
  
  // Nouveaux indicateurs pour discipline, sanctions et performance (périmètre manager)
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  explanationRequestsEvolution: { month: string; count: number }[];
  sanctionsByType: { type: string; count: number }[];
  performanceEvolution: { month: string; averageScore: number }[];
}