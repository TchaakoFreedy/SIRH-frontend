// src/app/features/rh/documents/services/document-generator.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DocumentData, EmployeeInfo, ResponsableRH } from '../models/document.model';
import { EntrepriseService } from '../../../../core/services/entreprise.service';
import { DepartementService } from '../../../../core/services/departement.service';
import { AuthService } from '../../../../services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { EmployeService } from '../../../../core/services/employe.service';

interface EntrepriseInfo {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb: string;
  siret: string;
  nif: string;
  logo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentGeneratorService {
  private readonly DEFAULT_ENTREPRISE: EntrepriseInfo = {
    nom: 'FRIC',
    adresse: 'Yaoundé, Cameroun',
    telephone: '+237 222 222 222',
    email: 'contact@fric.com',
    siteWeb: 'www.fric.com',
    siret: '',
    nif: ''
  };

  private entrepriseInfo: EntrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
  private entrepriseLoaded = false;
  private pdfMakeReady = false;

  // ✅ Liste des responsables RH
  private responsablesRHSubject = new BehaviorSubject<ResponsableRH[]>([]);
  responsablesRH$ = this.responsablesRHSubject.asObservable();

  private employees: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  employees$ = this.employees.asObservable();

  constructor(
    private entrepriseService: EntrepriseService,
    private departementService: DepartementService,
    private authService: AuthService,
    private userService: UserService,
    private employeeService: EmployeService
  ) {
    this.initPdfMake();
    this.loadResponsablesRH();
  }

  // ==========================================
  // ✅ GESTION DES RESPONSABLES RH
  // ==========================================

  async loadResponsablesRH(): Promise<void> {
    try {
      const employees = await firstValueFrom(this.employeeService.getAll());
      const users = await firstValueFrom(this.userService.getUsers());
      
      const rhEmployees = employees.filter(emp => {
        const user = users.find(u => u.id === emp.userId || u.employeeId === emp.id);
        if (!user) return false;
        const roleId = user.roleId || '';
        return roleId.toUpperCase().includes('RH') || 
               roleId.toUpperCase().includes('RESPONSABLE');
      });

      const responsables: ResponsableRH[] = rhEmployees.map(emp => {
        const user = users.find(u => u.id === emp.userId || u.employeeId === emp.id);
        const id = emp.id || `rh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const nom = emp.nom || user?.lastName || '';
        const prenom = emp.prenom || user?.firstName || '';
        const nomComplet = `${prenom} ${nom}`.trim() || 'Responsable RH';
        
        return {
          id: id,
          nom: nom,
          prenom: prenom,
          nomComplet: nomComplet,
          titre: 'RESPONSABLE DES RESSOURCES HUMAINES',
          email: user?.email || '',
          telephone: typeof emp.telephone === 'number' ? String(emp.telephone) : emp.telephone || ''
        };
      });

      if (responsables.length === 0) {
        const defaultRH: ResponsableRH = {
          id: 'default-rh',
          nom: '',
          prenom: '',
          nomComplet: '',
          titre: 'RESPONSABLE DES RESSOURCES HUMAINES',
          email: '',
          telephone: ''
        };
        responsables.push(defaultRH);
      }

      this.responsablesRHSubject.next(responsables);
      console.log(`✅ ${responsables.length} responsable(s) RH chargé(s)`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des responsables RH:', error);
      const defaultRH: ResponsableRH = {
        id: 'default-rh-fallback',
        nom: '',
        prenom: '',
        nomComplet: '',
        titre: 'RESPONSABLE DES RESSOURCES HUMAINES',
        email: '',
        telephone: ''
      };
      this.responsablesRHSubject.next([defaultRH]);
    }
  }

  private get pdfMakeInstance(): any {
    return (window as any).pdfMake;
  }

  private initPdfMake(): void {
    console.log('⏳ Initialisation de pdfMake...');
    if (this.checkPdfMakeReady()) return;
    this.waitForPdfMake();
  }

  private checkPdfMakeReady(): boolean {
    const pdfMake = this.pdfMakeInstance;
    if (pdfMake && typeof pdfMake.createPdf === 'function') {
      this.pdfMakeReady = true;
      console.log('✅ pdfMake est prêt');
      return true;
    }
    return false;
  }

  private waitForPdfMake(): void {
    let attempts = 0;
    const maxAttempts = 30;
    const intervalId = setInterval(() => {
      attempts++;
      if (this.checkPdfMakeReady() || attempts >= maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= maxAttempts && !this.pdfMakeReady) {
          console.error('❌ pdfMake n\'a pas pu être chargé');
          this.loadPdfMakeFromCDN();
        }
      }
    }, 100);
  }

  private loadPdfMakeFromCDN(): void {
    console.log('🔄 Tentative de chargement pdfMake via CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    script.onload = () => {
      const fontScript = document.createElement('script');
      fontScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
      fontScript.onload = () => {
        this.checkPdfMakeReady();
        console.log('✅ pdfMake chargé depuis CDN');
      };
      fontScript.onerror = () => {
        console.error('❌ Échec du chargement des polices');
        this.setupFallbackFonts();
      };
      document.head.appendChild(fontScript);
    };
    script.onerror = () => {
      console.error('❌ Échec du chargement pdfMake depuis CDN');
      this.setupFallbackFonts();
    };
    document.head.appendChild(script);
  }

  private setupFallbackFonts(): void {
    const pdfMake = this.pdfMakeInstance;
    if (pdfMake) {
      pdfMake.fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };
      this.pdfMakeReady = true;
      console.log('✅ Polices de secours configurées');
    }
  }

  async loadEntrepriseInfoFromEmployee(employee: any): Promise<void> {
    try {
      const departementId = employee?.departementId || employee?.departement?.id;
      if (!departementId) {
        this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
        this.entrepriseLoaded = true;
        return;
      }

      let departement = null;
      try {
        departement = await firstValueFrom(this.departementService.getById(departementId));
      } catch (err) {
        this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
        this.entrepriseLoaded = true;
        return;
      }

      const entrepriseId = (departement as any)?.entrepriseId || (departement as any)?.entreprise?.id;
      if (!entrepriseId) {
        this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
        this.entrepriseLoaded = true;
        return;
      }

      let entreprise = null;
      try {
        const currentUser = await firstValueFrom(this.authService.currentUser$);
        const employeeId = currentUser?.employeeId || employee?.id;
        if (employeeId) {
          entreprise = await firstValueFrom(this.entrepriseService.getByEmployeeId(employeeId));
        }
      } catch (error) {}

      if (!entreprise) {
        try {
          entreprise = await firstValueFrom(this.entrepriseService.getById(entrepriseId));
        } catch (err) {}
      }

      if (entreprise) {
        this.entrepriseInfo = {
          nom: entreprise.name || this.DEFAULT_ENTREPRISE.nom,
          adresse: entreprise.adresse || this.DEFAULT_ENTREPRISE.adresse,
          telephone: entreprise.telephone || this.DEFAULT_ENTREPRISE.telephone,
          email: entreprise.email || this.DEFAULT_ENTREPRISE.email,
          siteWeb: entreprise.siteWeb || this.DEFAULT_ENTREPRISE.siteWeb,
          siret: '',
          nif: ''
        };
        this.entrepriseLoaded = true;
      } else {
        this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
        this.entrepriseLoaded = true;
      }
    } catch (error) {
      this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
      this.entrepriseLoaded = true;
    }
  }

  private getEntrepriseInfo(): EntrepriseInfo {
    return this.entrepriseInfo;
  }

  private getEmployeeData(employee: any): EmployeeInfo {
    return {
      id: employee.id || employee._id || '',
      nom: employee.nom || '',
      prenom: employee.prenom || '',
      matriculeInterne: employee.matriculeInterne || employee.matricule_interne || 'N/A',
      matricule_interne: employee.matricule_interne || employee.matriculeInterne || 'N/A',
      matricule_CNPS: employee.matricule_CNPS || employee.matriculeCNPS || '',
      poste: employee.poste || this.getPosteName(employee.posteId) || 'Non défini',
      posteId: employee.posteId || '',
      departement: employee.departement || this.getDepartementName(employee.departementId) || 'Non défini',
      departementId: employee.departementId || '',
      date_embauche: employee.date_embauche || new Date().toISOString(),
      sexe: employee.sexe || 'M',
      email: employee.email || employee.user?.email || '',
      telephone: employee.telephone || '',
      stagiaireFormation: employee.stagiaireFormation || '',
      stageDateDebut: employee.stageDateDebut || employee.date_embauche || '',
      stageDateFin: employee.stageDateFin || '',
      stageService: employee.stageService || '',
      stageSuperviseur: employee.stageSuperviseur || employee.stageEncadrant || '',
      stagiaireQualites: employee.stagiaireQualites || '',
      stageDureeMois: employee.stageDureeMois || '',
      dateNaissance: employee.dateNaissance || employee.date_naissance || '',
      nationalite: employee.nationalite || 'Camerounaise',
      adresse: employee.adresse || employee.adressee || '',
      cin: employee.cin || employee.numero_piece_identite || '',
      dateFinContrat: employee.dateFinContrat || employee.date_fin_contrat || 'ce jour'
    };
  }

  private getPosteName(posteId: string): string {
    const postes: Record<string, string> = {
      '1': 'Développeur Full Stack',
      '2': 'Chef de Projet',
      '3': 'Designer UX/UI',
      '4': 'DevOps Engineer',
      '5': 'Testeur QA'
    };
    return postes[posteId] || 'Poste non défini';
  }

  private getDepartementName(departementId: string): string {
    const departements: Record<string, string> = {
      '1': 'Informatique',
      '2': 'Design',
      '3': 'Quality Assurance',
      '4': 'Ressources Humaines',
      '5': 'Finance'
    };
    return departements[departementId] || 'Département non défini';
  }

  private generateDocumentNumber(type: string): string {
    const prefix = type === 'CERTIFICAT' ? 'CERT' : type === 'ATTESTATION_STAGE' ? 'ATT-STG' : 'ATT';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'Non spécifiée';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  private getCurrentDate(): string {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private getCurrentDateTime(): string {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + ' à ' + now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getFullName(employeeData: EmployeeInfo): string {
    return `${employeeData.prenom} ${employeeData.nom}`.trim();
  }

  private getDocumentHeader(numDocument: string): any {
    const entreprise = this.getEntrepriseInfo();
    return {
      columns: [
        {
          width: '15%',
          alignment: 'center',
          stack: [{ text: 'RH', style: 'logoText', margin: [0, 0, 0, 4] }]
        },
        {
          width: '60%',
          alignment: 'center',
          stack: [
            { text: entreprise.nom, style: 'companyName', margin: [0, 0, 0, 4] },
            { text: entreprise.adresse, style: 'companyAddress', margin: [0, 0, 0, 2] },
            { text: `Tél: ${entreprise.telephone} | Email: ${entreprise.email}`, style: 'companyContact', margin: [0, 0, 0, 2] }
          ]
        },
        {
          width: '25%',
          alignment: 'right',
          stack: [{ text: 'N° ' + numDocument, style: 'documentNumber', margin: [0, 0, 0, 4] }]
        }
      ],
      margin: [0, 0, 0, 15]
    };
  }

  private getDocumentFooter(numDocument: string, dateHeureGeneration: string): any {
    return {
      columns: [
        {
          width: '*',
          text: [
            { text: 'Document généré le ', style: 'footerText' },
            { text: dateHeureGeneration, style: 'footerTextBold' }
          ]
        },
        {
          width: 'auto',
          text: `N° ${numDocument}`,
          style: 'footerTextBold'
        }
      ],
      margin: [0, 20, 0, 0]
    };
  }

  private createAndDownloadPdf(docDefinition: any, fileName: string): void {
    try {
      if (!this.pdfMakeReady) {
        this.waitForPdfMake();
        if (!this.pdfMakeReady) {
          throw new Error('pdfMake n\'est pas disponible. Veuillez réessayer.');
        }
      }

      const pdfMake = this.pdfMakeInstance;
      if (!pdfMake || typeof pdfMake.createPdf !== 'function') {
        throw new Error('pdfMake n\'est pas correctement initialisé');
      }

      console.log('📄 Génération du PDF...');
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.download(fileName);
      console.log(`✅ PDF généré avec succès: ${fileName}`);
    } catch (error) {
      console.error('❌ Erreur lors de la création du PDF:', error);
      throw new Error('Impossible de générer le PDF');
    }
  }

  // ============ GÉNÉRATION DU CERTIFICAT DE TRAVAIL ============
  async generateCertificatTravail(employee: any, motif?: string): Promise<void> {
    await this.loadEntrepriseInfoFromEmployee(employee);
    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber('CERTIFICAT');
    const dateGeneration = this.getCurrentDate();
    const dateHeureGeneration = this.getCurrentDateTime();
    const entreprise = this.getEntrepriseInfo();
    
    // ✅ Récupérer le nom du responsable RH depuis l'employé ou fallback
    const responsableNom = employee.responsableRHNom || employee.responsableRH?.nomComplet || '_______________________';
    const responsableTitre = 'RESPONSABLE DES RESSOURCES HUMAINES';

    const matriculeCNPS = employeeData.matricule_CNPS || '.............' ;

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.5 },
      content: [
        this.getDocumentHeader(numDocument),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 520, y2: 0, lineWidth: 2, color: '#0d9488' }], margin: [0, 0, 0, 18] },
        { text: 'CERTIFICAT DE TRAVAIL', style: 'title', margin: [0, 0, 0, 16] },
        {
          stack: [
            { text: `Je soussignée ${responsableNom} agissant en qualité de ${responsableTitre} de la société dénommée ${entreprise.nom} dont le siège se trouve à ${entreprise.adresse},`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `Certifie par la présente que le nommé Mme/Mr ${this.getFullName(employeeData)}, né(e) le ${this.formatDate(employeeData.dateNaissance || employee.date_naissance || '')},`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `CNI N° : ${employeeData.cin || '.............'}`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `Matricule CNPS : ${matriculeCNPS}`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `A été employé au sein de cette entreprise en tant que ${employeeData.poste} du ${this.formatDate(employeeData.date_embauche)} au ${employeeData.dateFinContrat || 'ce jour'}.`, style: 'bodyText', margin: [0, 0, 0, 6] },
            ...(motif ? [{ text: `Motif de la demande : ${motif}`, style: 'bodyText', margin: [0, 0, 0, 6] }] : []),
            { text: 'Le présent certificat est délivré à l\'intéressé(e) pour servir et valoir ce que de droit.', style: 'bodyText', margin: [0, 0, 0, 16] }
          ]
        },
        {
          columns: [{
            width: '*',
            stack: [
              { text: `Fait à ${entreprise.adresse}, le ${dateGeneration}`, style: 'signatureText', margin: [0, 0, 0, 20] },
              { text: responsableNom, style: 'signatureName', margin: [0, 0, 0, 2] },
              { text: responsableTitre, style: 'signatureTitle', margin: [0, 0, 0, 14] },
              { text: '_________________________', style: 'signatureLine', margin: [0, 0, 0, 2] },
              { text: 'Signature et Cachet', style: 'signatureLabel' }
            ],
            alignment: 'center'
          }],
          margin: [0, 10, 0, 10]
        },
        this.getDocumentFooter(numDocument, dateHeureGeneration)
      ],
      styles: this.getStyles()
    };

    this.createAndDownloadPdf(docDefinition, `Certificat_Travail_${this.getFullName(employeeData)}_${numDocument}.pdf`);
  }

  // ============ GÉNÉRATION DE L'ATTESTATION DE STAGE ============
  async generateAttestationStage(employee: any, motif?: string): Promise<void> {
    await this.loadEntrepriseInfoFromEmployee(employee);
    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber('ATTESTATION_STAGE');
    const dateGeneration = this.getCurrentDate();
    const dateHeureGeneration = this.getCurrentDateTime();
    const entreprise = this.getEntrepriseInfo();
    
    // ✅ Récupérer le nom du responsable RH depuis l'employé ou fallback
    const responsableNom = employee.responsableRHNom || employee.responsableRH?.nomComplet || '_______________________';
    const responsableTitre = 'RESPONSABLE DES RESSOURCES HUMAINES';

    const stageDateDebut = employee.stageDateDebut || employeeData.date_embauche || '...';
    const stageDateFin = employee.stageDateFin || employeeData.stageDateFin || '...';
    const stagiaireFormation = employee.stagiaireFormation || employeeData.stagiaireFormation || 'étudiant(e)';
    const stageService = employee.stageService || employeeData.stageService || employeeData.departement || '...';
    const stageSuperviseur = employee.stageSuperviseur || employeeData.stageSuperviseur || 'le responsable du service';
    const stagiaireQualites = employee.stagiaireQualites || employeeData.stagiaireQualites || 'sérieux, rigueur et autonomie';
    const stageDureeMois = employee.stageDureeMois || employeeData.stageDureeMois || '...';

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.5 },
      content: [
        this.getDocumentHeader(numDocument),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 520, y2: 0, lineWidth: 2, color: '#0d9488' }], margin: [0, 0, 0, 18] },
        { text: 'ATTESTATION DE STAGE ACADEMIQUE', style: 'title', margin: [0, 0, 0, 16] },
        {
          stack: [
            { text: `Je soussignée ${responsableNom}, agissant en qualité de ${responsableTitre} d'${entreprise.nom}, certifie par la présente que ${this.getFullName(employeeData)}, a effectué un stage de ${stageDureeMois} mois au sein de notre entreprise ${entreprise.nom}.`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `Date : Du ${this.formatDate(stageDateDebut)} au ${this.formatDate(stageDateFin)}. En qualité de stagiaire académique au sein du département ${stageService}, spécialisation ${stagiaireFormation} sous la supervision de ${stageSuperviseur}.`, style: 'bodyText', margin: [0, 0, 0, 6] },
            ...(motif ? [{ text: `Motif de la demande : ${motif}`, style: 'bodyText', margin: [0, 0, 0, 6] }] : []),
            { text: 'Cette attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.', style: 'bodyText', margin: [0, 0, 0, 16] }
          ]
        },
        {
          columns: [{
            width: '*',
            stack: [
              { text: `Fait à ${entreprise.adresse}, le ${dateGeneration}`, style: 'signatureText', margin: [0, 0, 0, 20] },
              { text: responsableNom, style: 'signatureName', margin: [0, 0, 0, 2] },
              { text: responsableTitre, style: 'signatureTitle', margin: [0, 0, 0, 14] },
              { text: '_________________________', style: 'signatureLine', margin: [0, 0, 0, 2] },
              { text: 'Signature et Cachet', style: 'signatureLabel' }
            ],
            alignment: 'center'
          }],
          margin: [0, 10, 0, 10]
        },
        this.getDocumentFooter(numDocument, dateHeureGeneration)
      ],
      styles: this.getStyles()
    };

    this.createAndDownloadPdf(docDefinition, `Attestation_Stage_${this.getFullName(employeeData)}_${numDocument}.pdf`);
  }

  // ============ GÉNÉRATION DE L'ATTESTATION DE TRAVAIL ============
  async generateAttestationTravail(employee: any, motif?: string): Promise<void> {
    await this.loadEntrepriseInfoFromEmployee(employee);
    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber('ATTESTATION');
    const dateGeneration = this.getCurrentDate();
    const dateHeureGeneration = this.getCurrentDateTime();
    const entreprise = this.getEntrepriseInfo();
    
    // ✅ Récupérer le nom du responsable RH depuis l'employé ou fallback
    const responsableNom = employee.responsableRHNom || employee.responsableRH?.nomComplet || '_______________________';
    const responsableTitre = 'RESPONSABLE DES RESSOURCES HUMAINES';

    const matriculeCNPS = employeeData.matricule_CNPS || '.............' ;
    const cinNumber = employeeData.cin || '.............' ;
    const dateEmbauche = this.formatDate(employeeData.date_embauche);

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.5 },
      content: [
        this.getDocumentHeader(numDocument),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 520, y2: 0, lineWidth: 2, color: '#0d9488' }], margin: [0, 0, 0, 18] },
        { text: 'ATTESTATION DE TRAVAIL', style: 'title', margin: [0, 0, 0, 16] },
        {
          stack: [
            { text: `Je soussignée ${responsableNom} agissant en qualité de ${responsableTitre} de la société dénommée ${entreprise.nom} dont le siège se trouve à ${entreprise.adresse},`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `Atteste par la présente que le nommé Mme/Mr ${this.getFullName(employeeData)}, né(e) le ${this.formatDate(employeeData.dateNaissance || employee.date_naissance || '')},`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `CNI N° : ${cinNumber}`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `Matricule CNPS : ${matriculeCNPS}`, style: 'bodyText', margin: [0, 0, 0, 6] },
            { text: `Est employé au sein de cette entreprise en tant que ${employeeData.poste} du ${dateEmbauche} jusqu'à date.`, style: 'bodyText', margin: [0, 0, 0, 6] },
            ...(motif ? [{ text: `Motif de la demande : ${motif}`, style: 'bodyText', margin: [0, 0, 0, 6] }] : []),
            { text: 'La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.', style: 'bodyText', margin: [0, 0, 0, 16] }
          ]
        },
        {
          columns: [{
            width: '*',
            stack: [
              { text: `Fait à ${entreprise.adresse}, le ${dateGeneration}`, style: 'signatureText', margin: [0, 0, 0, 20] },
              { text: responsableNom, style: 'signatureName', margin: [0, 0, 0, 2] },
              { text: responsableTitre, style: 'signatureTitle', margin: [0, 0, 0, 14] },
              { text: '_________________________', style: 'signatureLine', margin: [0, 0, 0, 2] },
              { text: 'Signature et Cachet', style: 'signatureLabel' }
            ],
            alignment: 'center'
          }],
          margin: [0, 10, 0, 10]
        },
        this.getDocumentFooter(numDocument, dateHeureGeneration)
      ],
      styles: this.getStyles()
    };

    this.createAndDownloadPdf(docDefinition, `Attestation_Travail_${this.getFullName(employeeData)}_${numDocument}.pdf`);
  }

  // ============ PRÉVISUALISATION ============
  async previewDocument(documentType: 'CERTIFICAT' | 'ATTESTATION' | 'ATTESTATION_STAGE', employee: any, motif?: string): Promise<DocumentData> {
    await this.loadEntrepriseInfoFromEmployee(employee);
    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber(documentType);
    const dateGeneration = this.getCurrentDate();
    const entreprise = this.getEntrepriseInfo();
    
    // ✅ Récupérer le nom du responsable RH depuis l'employé
    const responsableNom = employee.responsableRHNom || '';

    return {
      employeeName: this.getFullName(employeeData),
      employeeMatricule: employeeData.matriculeInterne,
      employeeMatriculeCNPS: employeeData.matricule_CNPS,
      employeePoste: employeeData.poste,
      employeeDepartement: employeeData.departement,
      dateEmbauche: this.formatDate(employeeData.date_embauche),
      dateGeneration: dateGeneration,
      raisonSociale: entreprise.nom,
      adresseSociete: entreprise.adresse,
      telephoneSociete: entreprise.telephone,
      emailSociete: entreprise.email,
      motif: motif || '',
      documentType: documentType,
      numeroDocument: numDocument,
      stageDateDebut: this.formatDate(employeeData.date_embauche),
      stageDateFin: employeeData.stageDateFin || '',
      stagiaireFormation: employeeData.stagiaireFormation || '',
      stageService: employeeData.stageService || '',
      stageSuperviseur: employeeData.stageSuperviseur || '',
      stagiaireQualites: employeeData.stagiaireQualites || '',
      stageDureeMois: employeeData.stageDureeMois || '',
      employeeDateNaissance: employeeData.dateNaissance || '',
      employeeNationalite: employeeData.nationalite || 'Camerounaise',
      employeeAdresse: employeeData.adresse || '',
      employeeCIN: employeeData.cin || '',
      dateFin: employeeData.dateFinContrat || 'ce jour',
      responsableRH: {
        id: 'custom',
        nom: responsableNom.split(' ').slice(1).join(' ') || '',
        prenom: responsableNom.split(' ')[0] || '',
        nomComplet: responsableNom || '',
        titre: 'RESPONSABLE DES RESSOURCES HUMAINES'
      }
    };
  }

  // ============ STYLES PARTAGÉS ============
  private getStyles(): any {
    return {
      logoText: { fontSize: 20, bold: true, color: '#0d9488' },
      companyName: { fontSize: 16, bold: true, color: '#0d9488' },
      companyAddress: { fontSize: 9, color: '#475569' },
      companyContact: { fontSize: 9, color: '#475569' },
      documentNumber: { fontSize: 9, bold: true, color: '#0d9488' },
      title: { fontSize: 18, bold: true, alignment: 'center', color: '#0d9488', letterSpacing: 2, margin: [0, 0, 0, 12] },
      bodyText: { fontSize: 10, lineHeight: 1.6, alignment: 'justify' },
      signatureText: { fontSize: 10, alignment: 'center' },
      signatureName: { fontSize: 11, bold: true, alignment: 'center', color: '#0f172a' },
      signatureTitle: { fontSize: 9, alignment: 'center', color: '#475569' },
      signatureLine: { fontSize: 14, alignment: 'center', color: '#94a3b8' },
      signatureLabel: { fontSize: 8, alignment: 'center', color: '#94a3b8' },
      footerText: { fontSize: 8, color: '#94a3b8' },
      footerTextBold: { fontSize: 8, bold: true, color: '#475569' }
    };
  }
}