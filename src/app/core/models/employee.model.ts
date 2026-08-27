// src/app/core/models/employee.model.ts
import { Departement } from './departement.model';

export interface Employee {
  id?: string;
  nom: string;
  prenom?: string;
  matriculeInterne: string;
  matricule_interne: string;
  matricule_CNPS: string;
  sexe: string;
  date_naissance: string;
  telephone: number;
  numeroContactUrgence?: string;   // AJOUTÉ
  addresse: string;
  date_embauche: string;
  statut: string;
  poste: string;
  userId?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  departement: Departement;
  
  nombreEnfantsMoinsDe7Ans?: number;
  nombreEnfants?: number;
  email?: string;
  telephonePortable?: string;
}