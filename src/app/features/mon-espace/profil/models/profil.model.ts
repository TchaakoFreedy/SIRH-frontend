// src/app/features/mon-espace/profil/models/profil.model.ts

export interface ContactUrgence {
  nom: string;
  prenom: string;
  telephone: string;
  relation: string;
}

export interface InfosBancaires {
  banque: string;
  numeroCompte: string;
  modePaiement: string;
}

export interface ProfilEmployee {
  // Identité
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  genre: string;
  dateNaissance: string;
  adresse: string;
  photoUrl?: string;
  contactUrgence?: ContactUrgence;

  // Professionnel
  matricule_interne: string;
  matricule_CNPS: string;
  poste: string;
  departement: string;
  typeContrat: string;
  dateEmbauche: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'CONGE';
  managerNom?: string;

  // Administratif
  infosBancaires?: InfosBancaires;

  // Historique
  dernierBulletin?: string;
  derniereDemandeConge?: string;
  derniereModification?: string;
}

export interface OngletProfil {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
}