// src/app/features/rh/documents/services/document-generator.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DocumentData, EmployeeInfo } from '../models/document.model';
import { EntrepriseService } from '../../../../core/services/entreprise.service';
import { DepartementService } from '../../../../core/services/departement.service';
import { AuthService } from '../../../../services/auth.service';

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
    siret: 'RC/YAO/2024/001',
    nif: 'M0123456789012'
  };

  private entrepriseInfo: EntrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
  private entrepriseLoaded = false;
  private pdfMakeReady = false;

  private employees: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  employees$ = this.employees.asObservable();

  constructor(
    private entrepriseService: EntrepriseService,
    private departementService: DepartementService,
    private authService: AuthService
  ) {
    this.initPdfMake();
  }

  private get pdfMakeInstance(): any {
    return (window as any).pdfMake;
  }

  private initPdfMake(): void {
    console.log('⏳ Initialisation de pdfMake...');
    
    if (this.checkPdfMakeReady()) {
      return;
    }

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

  /**
   * ✅ Charge les informations de l'entreprise via le département de l'employé
   * Utilise les endpoints sécurisés pour tous les rôles
   */
 async loadEntrepriseInfoFromEmployee(employee: any): Promise<void> {
  try {
    // 1. Get department ID from employee
    const departementId = employee?.departementId || employee?.departement?.id;

    if (!departementId) {
      console.warn('⚠️ Aucun départementId trouvé, utilisation des valeurs par défaut');
      this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
      this.entrepriseLoaded = true;
      return;
    }

    console.log('🏢 Chargement du département:', departementId);

    // 2. Fetch department directly using existing getById
    let departement = null;
    try {
      departement = await firstValueFrom(
        this.departementService.getById(departementId)
      );
      console.log('✅ Département récupéré:', departement);
    } catch (err) {
      console.warn('⚠️ Échec getById, fallback sur valeurs par défaut');
      this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
      this.entrepriseLoaded = true;
      return;
    }

    // 3. Get entrepriseId from department (using any to bypass type issues)
    const entrepriseId = (departement as any)?.entrepriseId || (departement as any)?.entreprise?.id;
    if (!entrepriseId) {
      console.warn('⚠️ Département sans entrepriseId, utilisation des valeurs par défaut');
      this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
      this.entrepriseLoaded = true;
      return;
    }

    console.log('🏢 Chargement de l\'entreprise ID:', entrepriseId);

    // 4. Fetch entreprise using existing getByEmployeeId or getById
    let entreprise = null;
    try {
      // Try using the existing getByEmployeeId (works if employeeId is available)
      const currentUser = await firstValueFrom(this.authService.currentUser$);
      const employeeId = currentUser?.employeeId || employee?.id;
      if (employeeId) {
        console.log('👤 Récupération de l\'entreprise via getByEmployeeId:', employeeId);
        entreprise = await firstValueFrom(
          this.entrepriseService.getByEmployeeId(employeeId)
        );
        console.log('✅ Entreprise récupérée via getByEmployeeId:', entreprise);
      }
    } catch (error) {
      console.warn('⚠️ Échec getByEmployeeId, tentative avec getById:', error);
    }

    // Fallback to getById if the first attempt failed
    if (!entreprise) {
      try {
        console.log('🔄 Récupération de l\'entreprise via getById:', entrepriseId);
        entreprise = await firstValueFrom(
          this.entrepriseService.getById(entrepriseId)
        );
        console.log('✅ Entreprise récupérée via getById:', entreprise);
      } catch (err) {
        console.warn('⚠️ Échec getById, fallback sur valeurs par défaut');
      }
    }

    if (entreprise) {
      this.entrepriseInfo = {
        nom: entreprise.name || this.DEFAULT_ENTREPRISE.nom,
        adresse: entreprise.adresse || this.DEFAULT_ENTREPRISE.adresse,
        telephone: entreprise.telephone || this.DEFAULT_ENTREPRISE.telephone,
        email: entreprise.email || this.DEFAULT_ENTREPRISE.email,
        siteWeb: entreprise.siteWeb || this.DEFAULT_ENTREPRISE.siteWeb,
        siret: entreprise.siret || this.DEFAULT_ENTREPRISE.siret,
        nif: entreprise.nif || this.DEFAULT_ENTREPRISE.nif,
        logo: entreprise.logo || '/logo.png'
      };
      this.entrepriseLoaded = true;
      console.log('✅ Informations de l\'entreprise chargées:', this.entrepriseInfo);
    } else {
      console.warn('⚠️ Aucune entreprise trouvée, utilisation des valeurs par défaut');
      this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
      this.entrepriseLoaded = true;
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement de l\'entreprise:', error);
    this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
    this.entrepriseLoaded = true;
  }
}
  private getEntrepriseInfo(): EntrepriseInfo {
    return this.entrepriseInfo;
  }

  async getEntreprise(): Promise<EntrepriseInfo> {
    if (!this.entrepriseLoaded) {
      await this.loadEntrepriseInfo();
    }
    return this.getEntrepriseInfo();
  }

  async refreshEntrepriseInfo(): Promise<void> {
    this.entrepriseLoaded = false;
    await this.loadEntrepriseInfo();
  }

  /**
   * ✅ Méthode de fallback (gardée pour compatibilité)
   */
  private async loadEntrepriseInfo(): Promise<void> {
    try {
      const entreprises = await firstValueFrom(this.entrepriseService.getAll());
      
      if (entreprises && entreprises.length > 0) {
        const activeEntreprise = entreprises.find(e => e.statut === 'ACTIF') || entreprises[0];
        
        this.entrepriseInfo = {
          nom: activeEntreprise.name || this.DEFAULT_ENTREPRISE.nom,
          adresse: activeEntreprise.adresse || this.DEFAULT_ENTREPRISE.adresse,
          telephone: activeEntreprise.telephone || this.DEFAULT_ENTREPRISE.telephone,
          email: activeEntreprise.email || this.DEFAULT_ENTREPRISE.email,
          siteWeb: activeEntreprise.siteWeb || this.DEFAULT_ENTREPRISE.siteWeb,
          siret: activeEntreprise.siret || this.DEFAULT_ENTREPRISE.siret,
          nif: activeEntreprise.nif || this.DEFAULT_ENTREPRISE.nif,
          logo: activeEntreprise.logo || '/logo.png'
        };
        this.entrepriseLoaded = true;
        console.log('✅ Informations de l\'entreprise chargées (fallback):', this.entrepriseInfo);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement (fallback):', error);
      this.entrepriseInfo = { ...this.DEFAULT_ENTREPRISE };
    }
  }

  private getEmployeeData(employee: any): EmployeeInfo {
    return {
      id: employee.id || employee._id || '',
      nom: employee.nom || '',
      prenom: employee.prenom || '',
      matriculeInterne: employee.matriculeInterne || employee.matricule_interne || 'N/A',
      matricule_interne: employee.matricule_interne || employee.matriculeInterne || 'N/A',
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
      stageEncadrant: employee.stageEncadrant || '',
      stagiaireQualites: employee.stagiaireQualites || '',
      stageDuree: employee.stageDuree || '',
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

  getEmployeeName(employee: any): string {
    if (!employee) return 'N/A';
    return `${employee.prenom || ''} ${employee.nom || ''}`.trim() || employee.matriculeInterne || 'N/A';
  }

  private getDocumentHeader(numDocument: string): any {
    const entreprise = this.getEntrepriseInfo();
    
    return {
      columns: [
        {
          width: '15%',
          alignment: 'center',
          stack: [
            {
              text: 'RH',
              style: 'logoText',
              margin: [0, 0, 0, 4]
            }
          ]
        },
        {
          width: '60%',
          alignment: 'center',
          stack: [
            { 
              text: entreprise.nom, 
              style: 'companyName',
              margin: [0, 0, 0, 4]
            },
            { 
              text: entreprise.adresse, 
              style: 'companyAddress',
              margin: [0, 0, 0, 2]
            },
            { 
              text: `Tél: ${entreprise.telephone} | Email: ${entreprise.email}`, 
              style: 'companyContact',
              margin: [0, 0, 0, 2]
            },
            { 
              text: `SIRET: ${entreprise.siret} | NIF: ${entreprise.nif}`, 
              style: 'companyLegal',
              margin: [0, 0, 0, 2]
            }
          ]
        },
        {
          width: '25%',
          alignment: 'right',
          stack: [
            { 
              text: 'N° ' + numDocument,
              style: 'documentNumber',
              margin: [0, 0, 0, 4]
            }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
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
      margin: [0, 30, 0, 0]
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

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: 'Roboto'
      },
      content: [
        this.getDocumentHeader(numDocument),
        { 
          canvas: [{ 
            type: 'line', 
            x1: 0, 
            y1: 0, 
            x2: 515, 
            y2: 0, 
            lineWidth: 2, 
            color: '#0d9488' 
          }],
          margin: [0, 0, 0, 20]
        },
        { 
          text: 'CERTIFICAT DE TRAVAIL', 
          style: 'title',
          margin: [0, 0, 0, 16]
        },
        {
          stack: [
            { 
              text: `La société ${entreprise.nom}, dont le siège social est situé à ${entreprise.adresse},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `certifie par la présente que ${this.getFullName(employeeData)} (Matricule: ${employeeData.matriculeInterne}),`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `né(e) le ${this.formatDate(employeeData.dateNaissance || '')}, de nationalité ${employeeData.nationalite || 'Camerounaise'},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `domicilié(e) à ${employeeData.adresse || '...'}, titulaire de la carte d'identité nationale N° ${employeeData.cin || '...'},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `a été employé(e) au sein de notre société en qualité de ${employeeData.poste} au sein du département ${employeeData.departement},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `du ${this.formatDate(employeeData.date_embauche)} au ${employeeData.dateFinContrat || 'ce jour'}.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            ...(motif ? [
              { 
                text: `Motif de la demande: ${motif}`,
                style: 'bodyText',
                margin: [0, 0, 0, 8]
              }
            ] : []),
            { 
              text: 'Le présent certificat est délivré à l\'intéressé(e) pour servir et valoir ce que de droit.', 
              style: 'bodyText',
              margin: [0, 0, 0, 16]
            }
          ]
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { 
                  text: `Fait à ${entreprise.adresse}, le ${dateGeneration}`,
                  style: 'signatureText',
                  margin: [0, 0, 0, 4]
                },
                { 
                  text: 'La Direction des Ressources Humaines',
                  style: 'signatureTextBold',
                  margin: [0, 0, 0, 8]
                },
                {
                  text: '_________________________________',
                  style: 'signatureLine',
                  margin: [0, 0, 0, 4]
                },
                {
                  text: 'Signature et Cachet',
                  style: 'signatureLabel'
                }
              ]
            },
            {
              width: '50%',
              alignment: 'right',
              stack: [
                { 
                  text: this.getFullName(employeeData),
                  style: 'signatureTextBold',
                  margin: [0, 0, 0, 8]
                },
                {
                  text: '_________________________________',
                  style: 'signatureLine',
                  margin: [0, 0, 0, 4]
                },
                {
                  text: '(Signature précédée de la mention "Lu et approuvé")',
                  style: 'signatureLabel'
                }
              ]
            }
          ],
          margin: [0, 30, 0, 20]
        },
        this.getDocumentFooter(numDocument, dateHeureGeneration)
      ],
      styles: this.getStyles()
    };

    this.createAndDownloadPdf(
      docDefinition, 
      `Certificat_Travail_${this.getFullName(employeeData)}_${numDocument}.pdf`
    );
  }

  // ============ GÉNÉRATION DE L'ATTESTATION DE STAGE ============
  async generateAttestationStage(employee: any, motif?: string): Promise<void> {
    await this.loadEntrepriseInfoFromEmployee(employee);

    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber('ATTESTATION_STAGE');
    const dateGeneration = this.getCurrentDate();
    const dateHeureGeneration = this.getCurrentDateTime();
    const entreprise = this.getEntrepriseInfo();

    const stageDateDebut = employeeData.date_embauche || employee.stageDateDebut || '...';
    const stageDateFin = employee.stageDateFin || employeeData.stageDateFin || '...';
    const stagiaireFormation = employee.stagiaireFormation || employeeData.stagiaireFormation || 'étudiant(e)';
    const stageService = employee.stageService || employeeData.stageService || employeeData.departement || '...';
    const stageEncadrant = employee.stageEncadrant || employeeData.stageEncadrant || 'le responsable du service';
    const stagiaireQualites = employee.stagiaireQualites || employeeData.stagiaireQualites || 'sérieux, rigueur et autonomie';
    const stageDuree = employee.stageDuree || employeeData.stageDuree || '...';

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: 'Roboto'
      },
      content: [
        this.getDocumentHeader(numDocument),
        { 
          canvas: [{ 
            type: 'line', 
            x1: 0, 
            y1: 0, 
            x2: 515, 
            y2: 0, 
            lineWidth: 2, 
            color: '#0d9488' 
          }],
          margin: [0, 0, 0, 20]
        },
        { 
          text: 'ATTESTATION DE STAGE', 
          style: 'title',
          margin: [0, 0, 0, 16]
        },
        {
          stack: [
            { 
              text: `La société ${entreprise.nom}, dont le siège social est situé à ${entreprise.adresse},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `atteste par la présente que ${this.getFullName(employeeData)},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `${stagiaireFormation},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `a effectué un stage au sein de notre structure du ${this.formatDate(stageDateDebut)} au ${this.formatDate(stageDateFin)},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `soit une durée totale de ${stageDuree}.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `Durant cette période, ${this.getFullName(employeeData)} a été intégré(e) au sein du service ${stageService}`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `où il/elle a été encadré(e) par ${stageEncadrant}.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `${this.getFullName(employeeData)} a fait preuve de ${stagiaireQualites} tout au long de son stage.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: 'Il/Elle a su s\'intégrer parfaitement dans l\'équipe et a contribué activement aux projets qui lui ont été confiés.', 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            ...(motif ? [
              { 
                text: `Motif de la demande: ${motif}`,
                style: 'bodyText',
                margin: [0, 0, 0, 8]
              }
            ] : []),
            { 
              text: 'La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.', 
              style: 'bodyText',
              margin: [0, 0, 0, 16]
            }
          ]
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { 
                  text: `Fait à ${entreprise.adresse}, le ${dateGeneration}`,
                  style: 'signatureText',
                  margin: [0, 0, 0, 4]
                },
                { 
                  text: 'La Direction des Ressources Humaines',
                  style: 'signatureTextBold',
                  margin: [0, 0, 0, 8]
                },
                {
                  text: '_________________________________',
                  style: 'signatureLine',
                  margin: [0, 0, 0, 4]
                },
                {
                  text: 'Signature et Cachet',
                  style: 'signatureLabel'
                }
              ]
            },
            {
              width: '50%',
              alignment: 'right',
              stack: [
                { 
                  text: this.getFullName(employeeData),
                  style: 'signatureTextBold',
                  margin: [0, 0, 0, 8]
                },
                {
                  text: '_________________________________',
                  style: 'signatureLine',
                  margin: [0, 0, 0, 4]
                },
                {
                  text: '(Signature précédée de la mention "Lu et approuvé")',
                  style: 'signatureLabel'
                }
              ]
            }
          ],
          margin: [0, 30, 0, 20]
        },
        this.getDocumentFooter(numDocument, dateHeureGeneration)
      ],
      styles: this.getStyles()
    };

    this.createAndDownloadPdf(
      docDefinition, 
      `Attestation_Stage_${this.getFullName(employeeData)}_${numDocument}.pdf`
    );
  }

  // ============ GÉNÉRATION DE L'ATTESTATION DE TRAVAIL ============
  async generateAttestationTravail(employee: any, motif?: string): Promise<void> {
    await this.loadEntrepriseInfoFromEmployee(employee);

    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber('ATTESTATION');
    const dateGeneration = this.getCurrentDate();
    const dateHeureGeneration = this.getCurrentDateTime();
    const entreprise = this.getEntrepriseInfo();

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: 'Roboto'
      },
      content: [
        this.getDocumentHeader(numDocument),
        { 
          canvas: [{ 
            type: 'line', 
            x1: 0, 
            y1: 0, 
            x2: 515, 
            y2: 0, 
            lineWidth: 2, 
            color: '#0d9488' 
          }],
          margin: [0, 0, 0, 20]
        },
        { 
          text: 'ATTESTATION DE TRAVAIL', 
          style: 'title',
          margin: [0, 0, 0, 16]
        },
        {
          stack: [
            { 
              text: `La société ${entreprise.nom}, dont le siège social est situé à ${entreprise.adresse},`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `atteste par la présente que ${this.getFullName(employeeData)} (Matricule: ${employeeData.matriculeInterne}),`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `est employé(e) au sein de notre société en qualité de ${employeeData.poste} au sein du département ${employeeData.departement}.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `Date d'embauche: ${this.formatDate(employeeData.date_embauche)}.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            { 
              text: `Le/La présent(e) employé(e) est actuellement en poste et remplit ses fonctions avec assiduité.`, 
              style: 'bodyText',
              margin: [0, 0, 0, 8]
            },
            ...(motif ? [
              { 
                text: `Motif de la demande: ${motif}`,
                style: 'bodyText',
                margin: [0, 0, 0, 8]
              }
            ] : []),
            { 
              text: 'La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.', 
              style: 'bodyText',
              margin: [0, 0, 0, 16]
            }
          ]
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { 
                  text: `Fait à ${entreprise.adresse}, le ${dateGeneration}`,
                  style: 'signatureText',
                  margin: [0, 0, 0, 4]
                },
                { 
                  text: 'La Direction des Ressources Humaines',
                  style: 'signatureTextBold',
                  margin: [0, 0, 0, 8]
                },
                {
                  text: '_________________________________',
                  style: 'signatureLine',
                  margin: [0, 0, 0, 4]
                },
                {
                  text: 'Signature et Cachet',
                  style: 'signatureLabel'
                }
              ]
            },
            {
              width: '50%',
              alignment: 'right',
              stack: [
                { 
                  text: this.getFullName(employeeData),
                  style: 'signatureTextBold',
                  margin: [0, 0, 0, 8]
                },
                {
                  text: '_________________________________',
                  style: 'signatureLine',
                  margin: [0, 0, 0, 4]
                },
                {
                  text: '(Signature précédée de la mention "Lu et approuvé")',
                  style: 'signatureLabel'
                }
              ]
            }
          ],
          margin: [0, 30, 0, 20]
        },
        this.getDocumentFooter(numDocument, dateHeureGeneration)
      ],
      styles: this.getStyles()
    };

    this.createAndDownloadPdf(
      docDefinition, 
      `Attestation_Travail_${this.getFullName(employeeData)}_${numDocument}.pdf`
    );
  }

  // ============ PRÉVISUALISATION ============
  async previewDocument(documentType: 'CERTIFICAT' | 'ATTESTATION' | 'ATTESTATION_STAGE', employee: any, motif?: string): Promise<DocumentData> {
    await this.loadEntrepriseInfoFromEmployee(employee);

    const employeeData = this.getEmployeeData(employee);
    const numDocument = this.generateDocumentNumber(documentType);
    const dateGeneration = this.getCurrentDate();
    const entreprise = this.getEntrepriseInfo();

    return {
      employeeName: this.getFullName(employeeData),
      employeeMatricule: employeeData.matriculeInterne,
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
      stageEncadrant: employeeData.stageEncadrant || '',
      stagiaireQualites: employeeData.stagiaireQualites || '',
      stageDuree: employeeData.stageDuree || '',
      employeeDateNaissance: employeeData.dateNaissance || '',
      employeeNationalite: employeeData.nationalite || 'Camerounaise',
      employeeAdresse: employeeData.adresse || '',
      employeeCIN: employeeData.cin || '',
      dateFin: employeeData.dateFinContrat || 'ce jour'
    };
  }

  // ============ STYLES PARTAGÉS ============
  private getStyles(): any {
    return {
      logoText: {
        fontSize: 24,
        bold: true,
        color: '#0d9488'
      },
      companyName: {
        fontSize: 18,
        bold: true,
        color: '#0d9488'
      },
      companyAddress: {
        fontSize: 10,
        color: '#475569'
      },
      companyContact: {
        fontSize: 10,
        color: '#475569'
      },
      companyLegal: {
        fontSize: 9,
        color: '#64748b'
      },
      documentNumber: {
        fontSize: 10,
        bold: true,
        color: '#0d9488'
      },
      title: {
        fontSize: 22,
        bold: true,
        alignment: 'center',
        color: '#0d9488',
        letterSpacing: 2,
        margin: [0, 0, 0, 16]
      },
      bodyText: {
        fontSize: 12,
        lineHeight: 1.8,
        alignment: 'justify'
      },
      signatureText: {
        fontSize: 12,
        alignment: 'center'
      },
      signatureTextBold: {
        fontSize: 12,
        bold: true,
        alignment: 'center'
      },
      signatureLine: {
        fontSize: 16,
        alignment: 'center',
        color: '#94a3b8'
      },
      signatureLabel: {
        fontSize: 10,
        alignment: 'center',
        color: '#94a3b8'
      },
      footerText: {
        fontSize: 9,
        color: '#94a3b8'
      },
      footerTextBold: {
        fontSize: 9,
        bold: true,
        color: '#475569'
      }
    };
  }
}