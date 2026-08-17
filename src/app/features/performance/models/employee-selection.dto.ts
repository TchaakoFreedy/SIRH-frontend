// src/app/features/performance/models/employee-selection.dto.ts

export interface EmployeeSelectionDTO {
  id: string;
  nom: string;
  prenom: string;
  matriculeInterne: string;
  departementId: string;
  departementNom: string;
  statut: string;
  selected: boolean;
}

export interface EmployeeWithCriteriaDTO extends EmployeeSelectionDTO {
  criteresCount: number;
  criteresIds: string[];
  criteresTypes: string[];
}

export interface EmployeePerformanceSummary {
  employeeId: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  totalEvaluations: number;
  averageScore: number;
  lastEvaluationDate?: Date;
  bestMention?: string;
}