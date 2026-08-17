// src/app/core/models/contrat.model.ts

export interface Contrat {
  id: string;
  typeContrat: TypeContrat;
  typeContratLibelle: string;
  dateDebut: string;
  dateFin: string | null;
  dateFinEssai: string | null;
  dureeEssaiMois: number | null;
  statut: StatutContrat;
  statutLibelle: string;
  salaireBrut: number | null;
  salaireNet: number | null;
  tauxHoraire: number | null;
  nombreHeuresSemaine: number | null;

  employeeId: string;
  employeeNom: string;
  employeePrenom: string;
  employeeMatricule: string;

  motifRecours: string | null;
  dureeMois: number | null;

  etablissement: string | null;
  tuteurNom: string | null;
  tuteurEmail: string | null;
  tuteurTelephone: string | null;
  objectifsStage: string | null;
  dureeSemaines: number | null;

  descriptionPrestation: string | null;
  modalitesPaiement: string | null;
  dureeMoisPrestation: number | null;

  estRenouvelable: boolean;
  nombreRenouvellements: number;
  renouvellementMax: number | null;
  estRenouvele: boolean;
  contratPrecedentId: string | null;

  motifResiliation: string | null;
  dateResiliation: string | null;

  imageUrls: string[];
  observations: string | null;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type TypeContrat = 'CDI' | 'CDD' | 'ESSAI' | 'STAGE_ACADEMIQUE' | 'STAGE_PROFESSIONNEL' | 'FREELANCE';

export type StatutContrat = 'ACTIF' | 'EN_ATTENTE' | 'SUSPENDU' | 'EXPIRE' | 'RESILIE' | 'ARCHIVE' | 'EN_RENOUVELLEMENT' | 'EN_ESSAI' | 'A_VENIR';

// DTOs pour la création, mise à jour, renouvellement
export interface CreateContratRequest {
  employeeId: string;
  typeContrat: TypeContrat;
  dateDebut: string;
  dateFin?: string | null;
  dateFinEssai?: string | null;
  dureeEssaiMois?: number | null;
  statut?: StatutContrat;
  salaireBrut?: number | null;
  salaireNet?: number | null;
  tauxHoraire?: number | null;
  nombreHeuresSemaine?: number | null;
  motifRecours?: string | null;
  dureeMois?: number | null;
  etablissement?: string | null;
  tuteurNom?: string | null;
  tuteurEmail?: string | null;
  tuteurTelephone?: string | null;
  objectifsStage?: string | null;
  dureeSemaines?: number | null;
  descriptionPrestation?: string | null;
  modalitesPaiement?: string | null;
  dureeMoisPrestation?: number | null;
  estRenouvelable?: boolean;
  renouvellementMax?: number | null;
  observations?: string | null;
}

// Ajout des interfaces manquantes
export interface UpdateContratRequest extends Partial<CreateContratRequest> {
  // On peut ajouter des champs spécifiques si besoin
}

export interface RenouvellementContratRequest {
  contratId: string;
  nouvelleDateFin: string;
}

export interface StatistiquesContratDTO {
  totalContrats: number;
  contratsActifs: number;
  contratsExpires: number;
  contratsArchives: number;
  contratsEnAttente: number;
  contratsARenouveler: number;
  parStatut: Record<string, number>;
  parType: Record<string, number>;
  tauxActif: number;
}

// Configuration des types de contrat
export const CONTRACT_TYPE_CONFIG: Record<TypeContrat, {
  label: string;
  hasEndDate: boolean;
  requiresTrialPeriod: boolean;
  requiresSalary: boolean;
  requiresMotifRecours: boolean;
  requiresEtablissement: boolean;
  requiresTuteur: boolean;
  requiresPrestationDescription: boolean;
  maxDurationMonths: number | null;
  showRenewable: boolean;
}> = {
  CDI: {
    label: 'CDI - Contrat à Durée Indéterminée',
    hasEndDate: false,
    requiresTrialPeriod: true,
    requiresSalary: true,
    requiresMotifRecours: false,
    requiresEtablissement: false,
    requiresTuteur: false,
    requiresPrestationDescription: false,
    maxDurationMonths: null,
    showRenewable: false
  },
  CDD: {
    label: 'CDD - Contrat à Durée Déterminée',
    hasEndDate: true,
    requiresTrialPeriod: true,
    requiresSalary: true,
    requiresMotifRecours: true,
    requiresEtablissement: false,
    requiresTuteur: false,
    requiresPrestationDescription: false,
    maxDurationMonths: 18,
    showRenewable: true
  },
  ESSAI: {
    label: 'Essai - Contrat d\'Essai',
    hasEndDate: true,
    requiresTrialPeriod: false,
    requiresSalary: true,
    requiresMotifRecours: false,
    requiresEtablissement: false,
    requiresTuteur: false,
    requiresPrestationDescription: false,
    maxDurationMonths: 6,
    showRenewable: false
  },
  STAGE_ACADEMIQUE: {
    label: 'Stage Académique',
    hasEndDate: true,
    requiresTrialPeriod: false,
    requiresSalary: false,
    requiresMotifRecours: false,
    requiresEtablissement: true,
    requiresTuteur: true,
    requiresPrestationDescription: false,
    maxDurationMonths: 6,
    showRenewable: false
  },
  STAGE_PROFESSIONNEL: {
    label: 'Stage Professionnel',
    hasEndDate: true,
    requiresTrialPeriod: false,
    requiresSalary: true,
    requiresMotifRecours: false,
    requiresEtablissement: true,
    requiresTuteur: true,
    requiresPrestationDescription: false,
    maxDurationMonths: 6,
    showRenewable: false
  },
  FREELANCE: {
    label: 'Prestation Freelance',
    hasEndDate: true,
    requiresTrialPeriod: false,
    requiresSalary: true,
    requiresMotifRecours: false,
    requiresEtablissement: false,
    requiresTuteur: false,
    requiresPrestationDescription: true,
    maxDurationMonths: null,
    showRenewable: true
  }
};

// Fonctions utilitaires (une seule fois)
export function getContractTypeConfig(type: TypeContrat): typeof CONTRACT_TYPE_CONFIG[TypeContrat] | null {
  return CONTRACT_TYPE_CONFIG[type] || null;
}

export function contractHasEndDate(type: TypeContrat): boolean {
  const config = getContractTypeConfig(type);
  return config ? config.hasEndDate : false;
}

export function contractRequiresTrialPeriod(type: TypeContrat): boolean {
  const config = getContractTypeConfig(type);
  return config ? config.requiresTrialPeriod : false;
}

export function getMaxDurationMonths(type: TypeContrat): number | null {
  const config = getContractTypeConfig(type);
  return config ? config.maxDurationMonths : null;
}

export function isContractInTrialPeriod(contrat: Contrat): boolean {
  if (!contrat.dureeEssaiMois || contrat.dureeEssaiMois <= 0) return false;
  if (!contrat.dateFinEssai) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finEssai = new Date(contrat.dateFinEssai);
  finEssai.setHours(0, 0, 0, 0);
  return finEssai >= today;
}

export function calculateTrialEndDate(dateDebut: string, dureeMois: number): string | null {
  if (!dateDebut || !dureeMois || dureeMois <= 0) return null;
  const debut = new Date(dateDebut);
  const finEssai = new Date(debut);
  finEssai.setMonth(finEssai.getMonth() + dureeMois);
  const year = finEssai.getFullYear();
  const month = String(finEssai.getMonth() + 1).padStart(2, '0');
  const day = String(finEssai.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStatutLibelle(statut: StatutContrat): string {
  const map: Record<StatutContrat, string> = {
    'ACTIF': 'Actif',
    'EN_ATTENTE': 'En attente de signature',
    'SUSPENDU': 'Suspendu',
    'EXPIRE': 'Expiré',
    'RESILIE': 'Résilié',
    'ARCHIVE': 'Archivé',
    'EN_RENOUVELLEMENT': 'En renouvellement',
    'EN_ESSAI': 'Période d\'essai',
    'A_VENIR': 'À venir'
  };
  return map[statut] || statut;
}

export function getTypeContratLibelle(type: TypeContrat): string {
  const config = getContractTypeConfig(type);
  return config ? config.label : type;
}