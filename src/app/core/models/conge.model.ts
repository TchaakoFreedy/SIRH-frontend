// src/app/core/models/conge.model.ts
import { Employee } from './employee.model';

export enum StatutConge {
  EN_ATTENTE = 'EN_ATTENTE',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
  ANNULE = 'ANNULE'
}

export enum TypeConge {
  ANNUEL = 'ANNUEL',
  MALADIE = 'MALADIE',
  PERMISSION = 'PERMISSION',
  ABSENCE = 'ABSENCE'
}

export interface Conge {
  id?: string;
  typeConge: TypeConge;
  nbJour: number;
  jourDebut: string;
  jourFin: string;
  statut: StatutConge;
  employee?: Employee;  // Relation complète
  managerId?: string;
  commentaireManager?: string;
  dateValidation?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}