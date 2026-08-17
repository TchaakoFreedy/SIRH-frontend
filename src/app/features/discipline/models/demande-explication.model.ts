export interface DemandeExplication {
  id?: string;
  numero: string;
  objet: string;
  description: string;
  motif: string;
  employeConcerneId: string;
  employeConcerneNom?: string;
  auteurId?: string;
  auteurNom?: string;
  entrepriseId?: string;
  departementId?: string;
  dateCreation?: Date;
  dateLimiteReponse?: Date;
  statut: StatutDemandeExplication;
  reponse?: ReponseExplication;
  historique?: HistoriqueDiscipline[];
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface ReponseExplication {
  id?: string;
  demandeExplicationId: string;
  contenu: string;
  piecesJointes?: string[];
  dateReponse?: Date;
  createdBy?: string;
  createdAt?: Date;
}

export interface HistoriqueDiscipline {
  utilisateurId: string;
  utilisateurNom: string;
  action: TypeActionHistorique;
  date: Date;
  commentaire: string;
}

export enum StatutDemandeExplication {
  EN_ATTENTE = 'EN_ATTENTE',
  REPONDUE = 'REPONDUE',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
  ANNULEE = 'ANNULEE'
}

export enum TypeActionHistorique {
  DEMANDE_CREEE = 'DEMANDE_CREEE',
  DEMANDE_MODIFIEE = 'DEMANDE_MODIFIEE',
  EMPLOYE_A_REPONDU = 'EMPLOYE_A_REPONDU',
  REPONSE_VALIDEE = 'REPONSE_VALIDEE',
  REPONSE_REJETEE = 'REPONSE_REJETEE',
  SANCTION_CREEE = 'SANCTION_CREEE',
  SANCTION_MODIFIEE = 'SANCTION_MODIFIEE',
  SANCTION_LEVEE = 'SANCTION_LEVEE'
}

export const StatutDemandeExplicationLabels: Record<StatutDemandeExplication, string> = {
  [StatutDemandeExplication.EN_ATTENTE]: 'En attente',
  [StatutDemandeExplication.REPONDUE]: 'Répondue',
  [StatutDemandeExplication.VALIDEE]: 'Validée',
  [StatutDemandeExplication.REJETEE]: 'Rejetée',
  [StatutDemandeExplication.ANNULEE]: 'Annulée'
};

export const StatutDemandeExplicationColors: Record<StatutDemandeExplication, string> = {
  [StatutDemandeExplication.EN_ATTENTE]: 'warning',
  [StatutDemandeExplication.REPONDUE]: 'info',
  [StatutDemandeExplication.VALIDEE]: 'success',
  [StatutDemandeExplication.REJETEE]: 'danger',
  [StatutDemandeExplication.ANNULEE]: 'secondary'
};