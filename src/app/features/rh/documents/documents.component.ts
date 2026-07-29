// src/app/features/rh/documents/documents.component.ts

import { Component, OnInit, signal, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, catchError, of, finalize, Subject, takeUntil } from 'rxjs';
import { EmployeService } from '../../../core/services/employe.service';
import { AuthService } from '../../../services/auth.service';
import { UserService, User } from '../../../core/services/user.service';
import { DepartementService } from '../../../core/services/departement.service';
import { PostesService } from '../../../core/services/postes.service';
import { Poste } from '../../../core/models/poste.model';
import { EntrepriseService } from '../../../core/services/entreprise.service';
import { Entreprise } from '../../../core/models/entreprise.model';
import { DocumentGeneratorService } from './services/document-generator.service';
import { DocumentType } from './models/document.model';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit, OnDestroy {
  private employeeService = inject(EmployeService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private departementService = inject(DepartementService);
  private postesService = inject(PostesService);
  private entrepriseService = inject(EntrepriseService);
  private documentGenerator = inject(DocumentGeneratorService);
  private cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPreviewModal = signal(false);
  
  selectedEmployee: any = null;
  currentUser: User | null = null;
  authUser: any = null;
  previewData: any = null;
  
  documentType: DocumentType = 'CERTIFICAT';
  motif: string = '';

  // Champs pour l'attestation de stage
  stagiaireFormation: string = '';
  stageDateDebut: string = '';
  stageDateFin: string = '';
  stageService: string = '';
  stageEncadrant: string = '';
  stagiaireQualites: string = '';

  // Champs pour le certificat de travail
  dateFinContrat: string = '';

  // Signaux pour poste et département
  posteNom = signal<string>('');
  departementNom = signal<string>('');

  // Signaux pour l'entreprise
  entreprise = signal<Entreprise | null>(null);
  entrepriseName = signal<string>('');
  entrepriseLogo = signal<string>('');
  entrepriseAddress = signal<string>('');
  entrepriseSiret = signal<string>('');
  entrepriseTelephone = signal<string>('');
  entrepriseEmail = signal<string>('');
  entrepriseSiteWeb = signal<string>('');

  get currentEmployee() {
    return this.selectedEmployee;
  }

  ngOnInit(): void {
    this.loadCurrentEmployee();
    this.initDefaultDates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initDefaultDates(): void {
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    this.stageDateDebut = oneMonthAgo.toISOString().split('T')[0];
    this.stageDateFin = today.toISOString().split('T')[0];
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Cline x1="3" y1="15" x2="21" y2="15"/%3E%3Cline x1="3" y1="9" x2="21" y2="9"/%3E%3C/svg%3E';
    img.style.objectFit = 'contain';
    img.style.padding = '8px';
  }

  formatDate(dateStr: any): string {
    if (!dateStr) {
      return new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
      }
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }

  private calculateStageDuree(): string {
    if (!this.stageDateDebut || !this.stageDateFin) return '...';
    
    const debut = new Date(this.stageDateDebut);
    const fin = new Date(this.stageDateFin);
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} jours`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      return `${months} mois${remainingDays > 0 ? ` et ${remainingDays} jours` : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} an${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` et ${remainingMonths} mois` : ''}`;
    }
  }

  /**
   * ✅ Charge l'entreprise via le département de l'employé
   */
  private loadEntrepriseFromDepartement(departementId: string): void {
    console.log('🏢 Chargement de l\'entreprise via le département:', departementId);
    
    this.departementService.getById(departementId).pipe(
      takeUntil(this.destroy$),
      catchError((err) => {
        console.error('❌ Erreur chargement département:', err);
        this.setDefaultEntreprise();
        return of(null);
      })
    ).subscribe({
      next: (departement) => {
        if (departement && departement.entrepriseId) {
          this.entrepriseService.getById(departement.entrepriseId).pipe(
            takeUntil(this.destroy$),
            catchError((err) => {
              console.error('❌ Erreur chargement entreprise:', err);
              this.setDefaultEntreprise();
              return of(null);
            })
          ).subscribe({
            next: (entreprise) => {
              if (entreprise) {
                this.entreprise.set(entreprise);
                this.entrepriseName.set(entreprise.name || 'FRIC');
                this.entrepriseLogo.set(entreprise.logo || '/logo.png');
                this.entrepriseAddress.set(entreprise.adresse || 'Yaoundé, Cameroun');
                this.entrepriseSiret.set(entreprise.siret || '');
                this.entrepriseTelephone.set(entreprise.telephone || '+237 222 222 222');
                this.entrepriseEmail.set(entreprise.email || 'contact@fric.com');
                this.entrepriseSiteWeb.set(entreprise.siteWeb || 'www.fric.com');
                console.log('✅ Entreprise chargée:', entreprise);
              } else {
                this.setDefaultEntreprise();
              }
              this.cdr.detectChanges();
            }
          });
        } else {
          console.warn('⚠️ Le département n\'a pas d\'entreprise associée');
          this.setDefaultEntreprise();
          this.cdr.detectChanges();
        }
      }
    });
  }

  private setDefaultEntreprise(): void {
    this.entrepriseName.set('FRIC');
    this.entrepriseLogo.set('/logo.png');
    this.entrepriseAddress.set('Yaoundé, Cameroun');
    this.entrepriseSiret.set('');
    this.entrepriseTelephone.set('+237 222 222 222');
    this.entrepriseEmail.set('contact@fric.com');
    this.entrepriseSiteWeb.set('www.fric.com');
    this.entreprise.set(null);
  }

  loadCurrentEmployee(): void {
    this.loading.set(true);

    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (userFromAuth) => {
        this.authUser = userFromAuth;
        
        if (!userFromAuth || !userFromAuth.id) {
          this.loading.set(false);
          this.errorMessage.set('❌ Utilisateur non authentifié.');
          return;
        }

        this.userService.getUser(userFromAuth.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (userFull: User) => {
            this.currentUser = userFull;
            
            const employeeId = userFull.employeeId || this.authUser?.employeeId || this.authUser?.id || '';
            
            if (employeeId) {
              this.loadEmployeeData(employeeId);
            } else {
              this.loading.set(false);
              this.errorMessage.set('❌ Aucun profil employé trouvé.');
              this.createEmployeeFromToken(this.authUser);
            }
          },
          error: (err) => {
            console.error('❌ Erreur chargement user:', err);
            this.loading.set(false);
            const employeeId = this.authUser?.employeeId || this.authUser?.id || '';
            if (employeeId) {
              this.loadEmployeeData(employeeId);
            } else {
              this.createEmployeeFromToken(this.authUser);
            }
          }
        });
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.loading.set(false);
        this.errorMessage.set('❌ Erreur lors du chargement.');
      }
    });
  }

  private loadEmployeeData(employeeId: string): void {
    this.loading.set(true);

    forkJoin({
      employe: this.employeeService.getById(employeeId).pipe(catchError(() => of(null)))
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading.set(false);
      })
    ).subscribe({
      next: (res) => {
        if (res.employe) {
          this.selectedEmployee = res.employe;
          console.log('✅ Employé chargé:', this.selectedEmployee);
          
          // ✅ Charger le département
          if (this.selectedEmployee.departementId) {
            this.departementService
              .getById(this.selectedEmployee.departementId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (departement) => {
                  this.departementNom.set(departement?.name || 'Département sans nom');
                  this.cdr.detectChanges();
                  
                  // ✅ Charger l'entreprise via le département
                  this.loadEntrepriseFromDepartement(this.selectedEmployee.departementId);
                },
                error: (err) => {
                  console.error('❌ Erreur département :', err);
                  this.departementNom.set('Département inconnu');
                  this.setDefaultEntreprise();
                  this.cdr.detectChanges();
                }
              });
          } else {
            this.departementNom.set('Aucun département assigné');
            this.setDefaultEntreprise();
          }

          // Charger le poste
          if (this.selectedEmployee.posteId) {
            this.postesService
              .getById(this.selectedEmployee.posteId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (poste: Poste) => {
                  const postName = poste?.libelle || 'Poste sans libellé';
                  this.posteNom.set(postName);
                  this.cdr.detectChanges();
                },
                error: (err) => {
                  console.error('❌ Erreur chargement poste :', err);
                  this.posteNom.set('Poste inconnu');
                  this.cdr.detectChanges();
                }
              });
          } else {
            this.posteNom.set('Aucun poste assigné');
          }

        } else {
          console.error('❌ Aucune donnée employé reçue');
          this.errorMessage.set('❌ Profil employé introuvable.');
          this.createEmployeeFromToken(this.authUser);
        }
      },
      error: (err) => {
        console.error('❌ Erreur chargement données employé:', err);
        this.errorMessage.set('❌ Erreur lors du chargement des données.');
        this.createEmployeeFromToken(this.authUser);
      }
    });
  }

  private createEmployeeFromToken(authUser: any): void {
    console.warn('⚠️ Fallback avec données du token');
    
    const userInfo = authUser || this.authService.getCurrentUser();
    const employeeId = this.authService.getCurrentEmployeeId();
    const userData = this.currentUser || userInfo;
    
    this.selectedEmployee = {
      id: employeeId || userData?.id || 'unknown',
      matriculeInterne: employeeId || userData?.matriculeInterne || userData?.matricule_interne || 'INCONNU',
      matricule_interne: employeeId || userData?.matriculeInterne || userData?.matricule_interne || 'INCONNU',
      matricule_CNPS: userData?.matriculeCNPS || '',
      prenom: userData?.firstName || userData?.prenom || 'Utilisateur',
      nom: userData?.lastName || userData?.nom || 'Système',
      poste: userData?.poste || userData?.posteId || 'Non défini',
      departement: userData?.departement || userData?.departementId || 'Non défini',
      posteId: userData?.posteId || null,
      departementId: userData?.departementId || null,
      date_embauche: userData?.dateEmbauche || new Date().toISOString().split('T')[0],
      telephone: userData?.telephone || '',
      adressee: userData?.adresse || userData?.adressee || '',
      email: userData?.email || '',
      sexe: userData?.sexe || 'Non spécifié',
      statut: userData?.statut || 'ACTIF',
      user: userData
    };
    
    this.posteNom.set(this.selectedEmployee.poste || 'Non défini');
    this.departementNom.set(this.selectedEmployee.departement || 'Non défini');
    this.setDefaultEntreprise();
    
    this.loading.set(false);
    console.log('📋 Employé factice créé:', this.selectedEmployee);
  }

  selectDocumentType(type: DocumentType): void {
    this.documentType = type;
    this.previewData = null;
    this.errorMessage.set('');
  }

  async previewDocument(): Promise<void> {
    if (!this.selectedEmployee) {
      this.errorMessage.set('❌ Aucun employé sélectionné');
      return;
    }

    try {
      this.loading.set(true);
      
      const employeeWithDetails = {
        ...this.selectedEmployee,
        poste: this.posteNom() || this.selectedEmployee.poste || 'Non défini',
        departement: this.departementNom() || this.selectedEmployee.departement || 'Non défini',
        entreprise: {
          name: this.entrepriseName(),
          logo: this.entrepriseLogo(),
          adresse: this.entrepriseAddress(),
          telephone: this.entrepriseTelephone(),
          email: this.entrepriseEmail(),
          siteWeb: this.entrepriseSiteWeb()
        },
        stagiaireFormation: this.stagiaireFormation || 'étudiant(e)',
        stageDateDebut: this.stageDateDebut || '...',
        stageDateFin: this.stageDateFin || '...',
        stageService: this.stageService || this.departementNom() || '...',
        stageEncadrant: this.stageEncadrant || 'le responsable du service',
        stagiaireQualites: this.stagiaireQualites || 'sérieux, rigueur et autonomie',
        stageDuree: this.calculateStageDuree(),
        dateFinContrat: this.dateFinContrat || 'ce jour',
        dateNaissance: this.selectedEmployee.dateNaissance || '...',
        nationalite: this.selectedEmployee.nationalite || 'Camerounaise',
        adresse: this.selectedEmployee.adresse || '...',
        cin: this.selectedEmployee.cin || this.selectedEmployee.numero_piece_identite || '...'
      };

      this.previewData = await this.documentGenerator.previewDocument(
        this.documentType,
        employeeWithDetails,
        this.motif
      );
      this.showPreviewModal.set(true);
      this.loading.set(false);
    } catch (error) {
      console.error('❌ Erreur lors de la prévisualisation:', error);
      this.errorMessage.set('❌ Erreur lors de la prévisualisation');
      this.loading.set(false);
      setTimeout(() => this.errorMessage.set(''), 3000);
    }
  }

  async generateDocument(): Promise<void> {
    if (!this.selectedEmployee) {
      this.errorMessage.set('❌ Aucun employé sélectionné');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const employeeWithDetails = {
        ...this.selectedEmployee,
        poste: this.posteNom() || this.selectedEmployee.poste || 'Non défini',
        departement: this.departementNom() || this.selectedEmployee.departement || 'Non défini',
        entreprise: {
          name: this.entrepriseName(),
          logo: this.entrepriseLogo(),
          adresse: this.entrepriseAddress(),
          telephone: this.entrepriseTelephone(),
          email: this.entrepriseEmail(),
          siteWeb: this.entrepriseSiteWeb()
        },
        stagiaireFormation: this.stagiaireFormation || 'étudiant(e)',
        stageDateDebut: this.stageDateDebut || '...',
        stageDateFin: this.stageDateFin || '...',
        stageService: this.stageService || this.departementNom() || '...',
        stageEncadrant: this.stageEncadrant || 'le responsable du service',
        stagiaireQualites: this.stagiaireQualites || 'sérieux, rigueur et autonomie',
        stageDuree: this.calculateStageDuree(),
        dateFinContrat: this.dateFinContrat || 'ce jour',
        dateNaissance: this.selectedEmployee.dateNaissance || '...',
        nationalite: this.selectedEmployee.nationalite || 'Camerounaise',
        adresse: this.selectedEmployee.adresse || '...',
        cin: this.selectedEmployee.cin || this.selectedEmployee.numero_piece_identite || '...'
      };

      switch (this.documentType) {
        case 'CERTIFICAT':
          await this.documentGenerator.generateCertificatTravail(
            employeeWithDetails, 
            this.motif || undefined
          );
          this.successMessage.set('✅ Certificat de travail généré avec succès !');
          break;
          
        case 'ATTESTATION_STAGE':
          await this.documentGenerator.generateAttestationStage(
            employeeWithDetails, 
            this.motif || undefined
          );
          this.successMessage.set('✅ Attestation de stage générée avec succès !');
          break;
          
        case 'ATTESTATION':
          await this.documentGenerator.generateAttestationTravail(
            employeeWithDetails, 
            this.motif || undefined
          );
          this.successMessage.set('✅ Attestation de travail générée avec succès !');
          break;
      }
      
      this.showPreviewModal.set(false);
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      this.errorMessage.set('❌ Erreur lors de la génération du document');
    } finally {
      this.loading.set(false);
      setTimeout(() => {
        this.successMessage.set('');
        this.errorMessage.set('');
      }, 5000);
    }
  }

  closePreview(): void {
    this.showPreviewModal.set(false);
  }

  getDocumentTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      'CERTIFICAT': 'Certificat de travail',
      'ATTESTATION': 'Attestation de travail',
      'ATTESTATION_STAGE': 'Attestation de stage'
    };
    return labels[type] || type;
  }

  getDocumentTitle(type: DocumentType): string {
    const titles: Record<DocumentType, string> = {
      'CERTIFICAT': 'CERTIFICAT DE TRAVAIL',
      'ATTESTATION': 'ATTESTATION DE TRAVAIL',
      'ATTESTATION_STAGE': 'ATTESTATION DE STAGE'
    };
    return titles[type] || type;
  }
}