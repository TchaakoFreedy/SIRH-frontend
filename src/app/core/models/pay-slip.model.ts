// src/app/core/models/pay-slip.model.ts

export interface PaySlip {
  id: string;
  employeeId?: string;
  employeeMatricule: string;
  employeeFullName: string;
  month: number;
  year: number;
  period: string;
  grossSalary: number;
  netSalary: number;
  deductions: number;
  pdfFileUrl?: string;
  uploadedFileName?: string;
  imageUrls: string[];
  imageIds?: string[];
  status?: PaySlipStatus;
  importErrors?: string[];
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type PaySlipStatus = 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'PARTIAL_SUCCESS' 
  | 'FAILED' 
  | 'EMPLOYEE_NOT_FOUND' 
  | 'OCR_ERROR' 
  | 'INVALID_DOCUMENT';

export interface PaySlipUploadResponse {
  totalEmployeesProcessed?: number;
  successCount?: number;
  failureCount?: number;
  errors: string[];
  message?: string;
  status?: string;
  id?: string;
  fileId?: string;
  totalPages?: number;
  pageCount?: number;
  imageIds?: string[];
  ocrPages?: number;
  textPages?: number;
  employeesMatched?: number;
  employeesNotMatched?: number;
  createdPayrolls?: number;
  processingTime?: string;
  employeeFound?: boolean;
  warnings?: string[];
}

export interface EmployeeReference {
  id: string;
  fullName?: string;
  matricule?: string;
  email?: string;
}