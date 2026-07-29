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
}