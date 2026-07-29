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
}