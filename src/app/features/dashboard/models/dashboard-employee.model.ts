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
  notifications: {
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    details: any;
  }[];
  
  // Nouveaux champs pour discipline, sanctions et performance
  pendingExplanationRequests: number;
  activeSanctions: number;
  pendingEvaluations: number;
  explanationRequestsEvolution: { month: string; count: number }[];
  sanctionsByType: { type: string; count: number }[];
  performanceEvolution: { month: string; averageScore: number }[];
}