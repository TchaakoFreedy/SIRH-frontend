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
  matriculeInterne?: string | null; // ⭐ AJOUTÉ
  matricule_interne?: string | null; // ⭐ AJOUTÉ
  lastLogin?: string | null;
  loginAttempts?: number;
  locked?: boolean;
  lockExpiryDate?: string | null;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
  employeeId?: string | null;
}

// src/app/core/models/employee.model.ts
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
  matriculeInterne?: string; // ⭐ AJOUTÉ
  matricule_interne?: string; // ⭐ AJOUTÉ
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Document {
  id?: string;
  type: string;
  nom: string;
  url: string;
  uploadedAt?: string;
}

// src/app/core/models/contrat.model.ts
export interface Contrat {
  id?: string;
  employeeId: string;
  typeContrat: 'CDI' | 'CDD' | 'INTERIM' | 'STAGE' | 'FREELANCE';
  dateDebut: string;
  dateFin: string;
  statut: 'ACTIF' | 'EXPIRE' | 'ARCHIVE' | 'SUSPENDU';
  imageUrls?: string[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  employeeNom?: string;
  employeePrenom?: string;
  employeePoste?: string;
}

export interface CreateContratRequest {
  employeeId: string;
  typeContrat: string;
  dateDebut: string;
  dateFin: string;
  statut?: string;
  imageUrls?: string[];
}