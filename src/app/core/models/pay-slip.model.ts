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
  imageIds: string[];
  status?: string; // PROCESSING, SUCCESS, PARTIAL_SUCCESS, FAILED, ...
  importErrors?: string[];
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PaySlipUploadResponse {
  // Champs du résumé avancé (nouveaux)
  totalPages?: number;
  createdPayrolls?: number;
  ocrPages?: number;
  textPages?: number;
  employeesMatched?: number;
  employeesNotMatched?: number;
  processingTime?: string;
  
  // Champs de compatibilité avec l'ancien modèle (conservés)
  totalEmployeesProcessed?: number;
  successCount?: number;
  failureCount?: number;
  
  // Liste des erreurs (obligatoire)
  errors: string[];
  
  // On peut ajouter un alias pour createdPayrolls -> successCount
  // et failureCount = nombre d'erreurs
}