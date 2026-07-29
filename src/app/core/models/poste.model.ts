// src/app/core/models/poste.model.ts

export interface Poste {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
  updatedBy: string | null;
  updatedAt: string | null;
  departement: any | null;
  departementId?: string;  // ✅ ADD THIS LINE
}

export interface CreatePosteRequest {
  code: string;
  libelle: string;
  description?: string;
  active?: boolean;
  departementId?: string;
}

export interface UpdatePosteRequest {
  code?: string;
  libelle?: string;
  description?: string;
  active?: boolean;
  departementId?: string;
}