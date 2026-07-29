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
}