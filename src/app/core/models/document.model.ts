// src/app/core/models/document.model.ts

export interface Document {
  id: string;
  name: string;
  typeDocument: string;
  imageUrls: string[];
  employeeId?: string;
  contratId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  status?: DocumentStatus;
  version?: number;
  tags?: string[];
  employee?: {
    id: string;
    nom: string;
    prenom: string;
    matricule?: string;
  };
  contrat?: {
    id: string;
    typeContrat: string;
    dateDebut: Date;
  };
}

export enum DocumentStatus {
  ACTIF = 'ACTIF',
  ARCHIVE = 'ARCHIVE',
  SUPPRIME = 'SUPPRIME',
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE'
}

export enum DocumentType {
  CONTRAT = 'CONTRAT',
  CV = 'CV',
  DIPLOME = 'DIPLOME',
  PIECE_IDENTITE = 'PIECE_IDENTITE',
  PHOTO = 'PHOTO',
  ATTESTATION = 'ATTESTATION',
  CERTIFICAT = 'CERTIFICAT',
  BULLETIN_PAIE = 'BULLETIN_PAIE',
  AVIS_IMPOT = 'AVIS_IMPOT',
  AUTRE = 'AUTRE'
}

// DTO pour la création d'un document
export interface CreateDocumentRequest {
  name: string;
  typeDocument: string;
  imageUrls?: string[];
  description?: string;
  tags?: string[];
}

// DTO pour la réponse d'upload
export interface DocumentUploadResponse {
  success: boolean;
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  message?: string;
}

// DTO pour les URLs des documents
export interface DocumentUrlResponse {
  id: string;
  name: string;
  url: string;
  typeDocument: string;
  createdAt: Date;
  fileSize?: number;
  thumbnailUrl?: string;
}

// DTO pour la mise à jour d'un document
export interface UpdateDocumentRequest {
  name?: string;
  description?: string;
  tags?: string[];
  status?: DocumentStatus;
}