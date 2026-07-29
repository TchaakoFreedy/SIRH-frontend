// ===== Entreprise =====
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

// ===== Employé =====
export interface Employe {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  genre: 'M' | 'F';
  dateEmbauche: string;
  departementId?: string;
  departementNom?: string;
  poste?: string;
  typeContrat?: 'CDI' | 'CDD' | 'STAGE';
  statut: 'ACTIF' | 'SUSPENDU';
  entrepriseId?: string;
}

// ===== Département =====
export interface Departement {
  id?: string;
  name: string;
  entrepriseId: string;
  statut?: string;
  createdAt?: string;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ===== Stats Dashboard =====
export interface DashboardStats {
  effectifTotal: number;
  employesActifs: number;
  employesSuspendus: number;
  nouvellesRecrues: number;
  nombreEntreprises: number;
  nombreDepartements: number;
  congesEnAttente: number;
  congesApprouves: number;
  congesRefuses: number;
  contratsExpirantBientot: number;
  evaluationsEnAttente: number;
  tauxAbsenteisme: number;
}

// ===== Notification =====
export interface Notification {
  id: string;
  type: 'CONGE' | 'CONTRAT' | 'EXPLICATION' | 'EVALUATION';
  message: string;
  date: string;
  lu: boolean;
}

// ===== Nav Item =====
export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: NavItem[];
  expanded?: boolean;
}