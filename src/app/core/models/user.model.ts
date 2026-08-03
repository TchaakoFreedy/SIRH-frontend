// src/app/core/models/user.model.ts
export interface User {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  active?: boolean;
  roleId?: string;
  permissions: string[];
  employeeId?: string | null;
  entrepriseId?: string | null; // ⭐ AJOUTÉ - ID de l'entreprise
  matriculeInterne?: string | null;
  matricule_interne?: string | null;
  lastLogin?: string | null;
  loginAttempts?: number;
  locked?: boolean;
  lockExpiryDate?: string | null;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Employee model - Ajouter entrepriseId
export interface Employee {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  poste?: string;
  dateEmbauche?: string;
  statut?: 'ACTIF' | 'INACTIF' | 'SUSPENDU';
  photoUrl?: string;
  documents?: Document[];
  userId?: string;
  matriculeInterne?: string;
  matricule_interne?: string;
  entrepriseId?: string; // ⭐ AJOUTÉ
  departementId?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}