// src/app/core/models/entreprise.model.ts

export interface Entreprise {
  id?: string;
  name: string;
  siret?: string;
  adresse?: string;
  siege?: string;
  logo?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  nif?: string;
  statut?: 'ACTIF' | 'SUSPENDU' | 'ARCHIVE' | string;
  createdAt?: string | Date;
  createdBy?: string;
  updatedAt?: string | Date;
  updatedBy?: string;
}

export interface EntreprisePayload {
  name: string;
  siret?: string;
  adresse?: string;
  siege?: string;
  logo?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  nif?: string;
  statut?: string;
}