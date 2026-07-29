// src/app/features/rh/documents/models/document.model.ts

export interface DocumentData {
  employeeName: string;
  employeeMatricule: string;
  employeePoste: string;
  employeeDepartement: string;
  dateEmbauche: string;
  dateGeneration: string;
  raisonSociale: string;
  adresseSociete: string;
  telephoneSociete: string;
  emailSociete: string;
  motif: string;
  documentType: 'CERTIFICAT' | 'ATTESTATION' | 'ATTESTATION_STAGE';
  numeroDocument: string;
  
  // Champs pour le certificat de travail
  employeeDateNaissance?: string;
  employeeNationalite?: string;
  employeeAdresse?: string;
  employeeCIN?: string;
  dateFin?: string;
  
  // Champs pour l'attestation de stage
  stagiaireFormation?: string;
  stageDateDebut?: string;
  stageDateFin?: string;
  stageService?: string;
  stageEncadrant?: string;
  stagiaireQualites?: string;
  stageDuree?: string;
}

export interface EmployeeInfo {
  id: string;
  nom: string;
  prenom: string;
  matriculeInterne: string;
  matricule_interne: string;
  poste: string;
  posteId: string;
  departement: string;
  departementId: string;
  date_embauche: string;
  sexe: string;
  email: string;
  telephone: string;
  
  // Propriétés pour l'attestation de stage
  stagiaireFormation?: string;
  stageDateDebut?: string;
  stageDateFin?: string;
  stageService?: string;
  stageEncadrant?: string;
  stagiaireQualites?: string;
  stageDuree?: string;
  
  // Propriétés pour le certificat de travail
  dateNaissance?: string;
  nationalite?: string;
  adresse?: string;
  cin?: string;
  dateFinContrat?: string;
}

export type DocumentType = 'CERTIFICAT' | 'ATTESTATION' | 'ATTESTATION_STAGE';