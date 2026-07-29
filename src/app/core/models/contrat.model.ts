// src/app/core/models/contrat.model.ts
export interface Contrat {
  id: string;
  typeContrat: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ACTIF' | 'EXPIRE' | 'ARCHIVE' | 'RESILIE' | 'EN_ATTENTE';
  imageUrls: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  employeeId: string;
  employeeNom: string;
  employeePrenom: string;
  employeeMatriculeInterne: string;
  employeeMatriculeCNPS: string;
  employeePoste: string;
  employeeDepartementId: string;
}

export interface CreateContratRequest {
  employeeId: string;
  typeContrat: string;
  dateDebut: string;
  dateFin: string | null;
  statut?: string;
  imageUrls?: string[];
}

export interface UpdateContratRequest {
  typeContrat: string;
  dateFin: string;
  statut?: string;
  imageUrls?: string[];
}

export interface RenouvellementContratRequest {
  contratId: string;
  nouvelleDateDebut: string;
  nouvelleDateFin: string;
  nouveauTypeContrat?: string;
  imageUrls?: string[];
}

export interface StatistiquesContrat {
  totalContrats: number;
  contratsActifs: number;
  contratsExpires: number;
  contratsEnAttente: number;
  contratsArchives: number;
  contratsARenouveler: number;
  parType: Record<string, number>;
  parStatut: Record<string, number>;
  tauxActif: number;
}