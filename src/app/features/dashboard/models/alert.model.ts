// src/app/features/dashboard/models/alert.model.ts

export interface ContractDetails {
  employeeName: string;
  contractType: string;
  startDate: string;
  endDate: string;
  status: string;
  daysRemaining: number;
}

export interface Alert {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: any;
  contractDetails?: ContractDetails;
}