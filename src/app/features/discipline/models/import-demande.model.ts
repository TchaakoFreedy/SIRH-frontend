// src/app/features/discipline/models/import-demande.model.ts
export interface ImportDemandeExplication {
  numeroOriginal: string;
  objet: string;
  description?: string;
  motif?: string;
  employeConcerneIdentifier: string;
  auteurIdentifier?: string;
  dateCreation?: string;
  dateLimiteReponse?: string;
  statut?: string;
  reponse?: {
    contenu: string;
    piecesJointes?: string[];
    dateReponse?: string;
    validee: boolean;
    rejetee: boolean;
  };
  historique?: Array<{
    action: string;
    date?: string;
    commentaire?: string;
  }>;
}

export interface ImportResult {
  numeroOriginal: string;
  demandeId?: string;
  success: boolean;
  duplicate: boolean;
  errorMessage?: string;
}