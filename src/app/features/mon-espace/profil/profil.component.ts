import { Component, OnInit, signal, computed, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, catchError, of, finalize, Subject, takeUntil } from 'rxjs';

import { AuthService, AuthUser } from '../../../services/auth.service';
import { EmployeService } from '../../../core/services/employe.service';
import { ContratService } from '../../../core/services/contrat.service';
import { DocumentService } from '../../../core/services/document.service';
import { UserService, User } from '../../../core/services/user.service';
import { DepartementService } from '../../../core/services/departement.service';
import { PostesService } from '../../../core/services/postes.service';
import { Poste } from '../../../core/models/poste.model';
import { DocumentPreviewModalComponent, DocumentPreviewData } from './components/document-preview-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    DocumentPreviewModalComponent
  ],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private employeService = inject(EmployeService);
  private contratService = inject(ContratService);
  private documentService = inject(DocumentService);
  private userService = inject(UserService);
  private departementService = inject(DepartementService);
  private postesService = inject(PostesService);
  private cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  private apiUrl = environment.apiUrl;

  // ─── Signaux ──────────────────────────────────────────────────────────────
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  isRH = signal<boolean>(false);
  ongletActif = signal<string>('personnel');
  notification = signal<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  showPasswordModal = signal<boolean>(false);
  showDocumentPreview = signal<boolean>(false);
  isDownloading = signal<boolean>(false);

  // ─── Données ──────────────────────────────────────────────────────────────
  profil: any = null;
  currentUser: User | null = null;
  authUser: AuthUser | null = null;
  contrats: any[] = [];
  documents: any[] = [];
  photoPreview: string | null = null;
  selectedPhotoFile: File | null = null;
  userRoleLabel: string = '';
  selectedDocument = signal<DocumentPreviewData | null>(null);
  
  // ─── SIGNALS ──────────────────────────────────────────────────────────────
  posteNom = signal<string>('');
  departementNom = signal<string>('');

  // ─── Formulaires ─────────────────────────────────────────────────────────
  personalForm!: FormGroup;
  passwordForm!: FormGroup;

  // ─── Onglets ──────────────────────────────────────────────────────────────
  onglets = [
    { id: 'personnel', label: 'Personnel', icon: '' },
    { id: 'professionnel', label: 'Professionnel', icon: '' },
    { id: 'documents', label: 'Documents', icon: '' },
    { id: 'parametres', label: 'Sécurité', icon: '' }
  ];

  // ─── Computed ─────────────────────────────────────────────────────────────
  initiales = computed(() => {
    if (!this.profil) return 'RH';
    const p = this.profil.prenom?.charAt(0) || '';
    const n = this.profil.nom?.charAt(0) || '';
    return (p + n).toUpperCase() || 'RH';
  });

  anciennete = computed(() => {
    if (!this.profil?.date_embauche) return '';
    const embauche = new Date(this.profil.date_embauche);
    const maintenant = new Date();
    let ans = maintenant.getFullYear() - embauche.getFullYear();
    let mois = maintenant.getMonth() - embauche.getMonth();
    if (mois < 0 || (mois === 0 && maintenant.getDate() < embauche.getDate())) {
      ans--;
      mois += 12;
    }
    if (ans === 0) return `${mois} mois`;
    return `${ans} an${ans > 1 ? 's' : ''} et ${mois} mois`;
  });

  contratActif = computed(() => {
    return this.contrats.find(c => c.statut === 'ACTIF') || null;
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initFormularies();
    this.chargerDonneesProfil();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Initialisation ──────────────────────────────────────────────────────
  private initFormularies(): void {
    this.personalForm = this.fb.group({
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9+ ]{9,14}$/)]],
      adresse: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.passwordForm = this.fb.group({
      ancienMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationMotDePasse: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    const nouveau = g.get('nouveauMotDePasse')?.value;
    const confirmation = g.get('confirmationMotDePasse')?.value;
    return nouveau === confirmation ? null : { mismatch: true };
  }

  // ─── Chargement des données ─────────────────────────────────────────────
  chargerDonneesProfil(): void {
    this.isLoading.set(true);

    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (userFromAuth) => {
        this.authUser = userFromAuth;
        
        if (!userFromAuth) {
          this.isLoading.set(false);
          return; 
        }

        if (!userFromAuth.id) {
          this.showToast('error', 'Session utilisateur non trouvée. Veuillez vous reconnecter.');
          this.isLoading.set(false);
          return;
        }

        this.userService.getUser(userFromAuth.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (userFull: User) => {
            this.currentUser = userFull;
            
            this.isRH.set(userFull.role?.name === 'RH');
            this.userRoleLabel = this.userService.getRoleLabel(userFull.role?.name || '');
            
            const employeeId = userFull.employeeId || this.authUser?.employeeId || this.authUser?.id || '';
            
            if (employeeId) {
              this.loadEmployeeData(employeeId);
            } else {
              this.showToast('error', 'Impossible de trouver les données employé.');
              this.isLoading.set(false);
            }
          },
          error: (err) => {
            console.error('Erreur chargement user:', err);
            const fallbackUser: User = {
              id: this.authUser!.id!,
              firstName: this.authUser?.firstName || '',
              lastName: this.authUser?.lastName || '',
              email: this.authUser?.email || '',
              active: true,
              roleId: this.authUser?.roleId || '',
              loginAttempts: 0,
              locked: false,
              createdAt: '',
              createdBy: '',
              employeeId: this.authUser?.employeeId
            };
            this.currentUser = fallbackUser;
            
            const employeeId = this.authUser?.employeeId || this.authUser?.id || '';
            if (employeeId) {
              this.loadEmployeeData(employeeId);
            } else {
              this.isLoading.set(false);
              this.showToast('error', 'Impossible de trouver les données employé.');
            }
          }
        });
      },
      error: (err) => {
        console.error('Erreur lors du suivi de la session:', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadEmployeeData(employeeId: string): void {
    this.isLoading.set(true);

    forkJoin({
      employe: this.employeService.getById(employeeId).pipe(catchError(() => of(null))),
      contrats: this.contratService.getByEmployee(employeeId).pipe(catchError(() => of([]))),
      docs: this.documentService.getByEmployee(employeeId).pipe(catchError(() => of([])))
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading.set(false);
        console.log(' Loading complete');
      })
    ).subscribe({
      next: (res) => {
        console.log(' Raw response from forkJoin:', res);
        
        if (res.employe) {
          this.profil = res.employe;
          console.log(' Employee loaded:', this.profil);
          
          this.personalForm.patchValue({
            telephone: res.employe.telephone || '',
            adresse: res.employe.addresse || ''
          });

          // --- LOAD DEPARTMENT ---
          if (this.profil.departementId) {
            this.departementService
              .getById(this.profil.departementId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (departement) => {
                  this.departementNom.set(departement?.name || 'Département sans nom');
                  this.cdr.detectChanges();
                },
                error: (err) => {
                  console.error('❌ Erreur département :', err);
                  this.departementNom.set('Département inconnu');
                  this.cdr.detectChanges();
                }
              });
          } else {
            this.departementNom.set('Aucun département assigné');
          }

          // --- LOAD POSITION/POST ---
          if (this.profil.posteId) {
            this.postesService
              .getById(this.profil.posteId)
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

          // Update contrats and documents
          this.contrats = res.contrats || [];
          this.documents = res.docs || [];
          
          console.log('📄 Documents loaded:', this.documents.length, 'documents');
          if (this.documents.length > 0) {
            console.log('📄 Sample document:', this.documents[0]);
            console.log('📄 Document imageUrls:', this.documents[0].imageUrls);
          } else {
            console.log('📄 No documents found for this employee');
          }

          this.cdr.detectChanges();
          
        } else {
          console.error('❌ No employee data received');
          this.showToast('error', 'Profil employé introuvable.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur chargement données:', err);
        this.showToast('error', 'Erreur lors du chargement des données.');
        this.isLoading.set(false);
      }
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────
  changerOnglet(id: string): void {
    this.ongletActif.set(id);
  }

  // ─── Mode édition ──────────────────────────────────────────────────────
  activerModification(): void {
    this.isEditMode.set(true);
    if (this.profil) {
      this.personalForm.patchValue({
        telephone: this.profil.telephone || '',
        adresse: this.profil.addresse || ''
      });
    }
  }

  annulerModification(): void {
    this.isEditMode.set(false);
    this.photoPreview = null;
    this.selectedPhotoFile = null;
    if (this.profil) {
      this.personalForm.patchValue({
        telephone: this.profil.telephone || '',
        adresse: this.profil.addresse || ''
      });
    }
    this.personalForm.markAsPristine();
  }

  // ─── Sauvegarde ──────────────────────────────────────────────────────────
  sauvegarderModifications(): void {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      this.showToast('error', 'Veuillez corriger les erreurs du formulaire.');
      return;
    }

    this.isSaving.set(true);

    const updatedData = {
      telephone: this.personalForm.value.telephone,
      addresse: this.personalForm.value.adresse
    };

    let updateMethod;
    if (this.isRH()) {
      updateMethod = this.employeService.updateByAdmin(this.profil.id, { ...this.profil, ...updatedData });
    } else {
      updateMethod = this.employeService.updateSelfProfile(this.profil.id, updatedData);
    }

    updateMethod.pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isSaving.set(false))
    ).subscribe({
      next: (savedEmployee) => {
        this.profil = savedEmployee;
        this.isEditMode.set(false);
        this.showToast('success', ' Profil mis à jour avec succès !');
        
        if (this.selectedPhotoFile) {
          this.uploadPhoto();
        }
      },
      error: (err) => {
        console.error('Erreur mise à jour:', err);
        this.showToast('error', err.error?.message || 'Erreur lors de la mise à jour du profil.');
      }
    });
  }

  private uploadPhoto(): void {
    if (!this.selectedPhotoFile || !this.profil?.id) return;

    const formData = new FormData();
    formData.append('files', this.selectedPhotoFile);

    const userId = this.profil.user?.id || this.currentUser?.id || this.authUser?.id;
    if (userId) {
      this.documentService.uploadPiecesEmploye(userId, formData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.showToast('success', ' Photo mise à jour avec succès !');
          this.photoPreview = null;
          this.selectedPhotoFile = null;
        },
        error: (err) => {
          console.error('Erreur upload photo:', err);
          this.showToast('error', 'Erreur lors du téléversement de la photo.');
        }
      });
    }
  }

  // ─── Photo ──────────────────────────────────────────────────────────────
  triggerPhotoInput(): void {
    document.getElementById('photoInput')?.click();
  }

  onPhotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedPhotoFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  // ─── Document Preview ──────────────────────────────────────────────────
  openDocumentPreview(doc: any): void {
    const previewData: DocumentPreviewData = {
      id: doc.id,
      name: doc.name || 'Document',
      typeDocument: doc.typeDocument,
      imageUrls: doc.imageUrls || [],
      dateUpload: doc.dateUpload,
      createdAt: doc.createdAt,
      createdBy: doc.createdBy
    };
    this.selectedDocument.set(previewData);
    this.showDocumentPreview.set(true);
  }

  closeDocumentPreview(): void {
    this.showDocumentPreview.set(false);
    this.selectedDocument.set(null);
  }

  // ─── Download Documents ──────────────────────────────────────────────

  /**
   * Download a single document from the preview modal
   */
  downloadSingleDocument(event: { documentId: string; url: string; name: string }): void {
    if (!event.documentId) {
      this.showToast('error', 'ID du document non trouvé.');
      return;
    }

    console.log(' Downloading single document by ID:', event.documentId);
    this.isDownloading.set(true);
    
    this.documentService.downloadDocumentFileAndSave(
      event.documentId, 
      event.name || 'document'
    );
    
    setTimeout(() => {
      this.isDownloading.set(false);
      this.showToast('success', ' Téléchargement en cours...');
    }, 1500);
  }

  /**
   * Download a document by ID - uses the backend file endpoint
   */
  downloadDocumentById(documentId: string, fileName?: string): void {
    console.log('📥 Downloading document by ID:', documentId);
    
    const doc = this.documents.find(d => d.id === documentId);
    
    if (!doc) {
      this.showToast('error', 'Document non trouvé.');
      return;
    }
    
    if (!doc.imageUrls || doc.imageUrls.length === 0) {
      this.showToast('error', 'Aucun fichier disponible pour ce document.');
      return;
    }
    
    this.isDownloading.set(true);
    
    this.documentService.downloadDocumentFileAndSave(
      documentId, 
      fileName || doc.name || 'document'
    );
    
    setTimeout(() => {
      this.isDownloading.set(false);
      this.showToast('success', ' Téléchargement en cours...');
    }, 1500);
  }

  /**
   * Download all documents for a document entry (multiple files)
   */
  downloadAllDocuments(event: { documentId: string; urls: string[]; name: string }): void {
    if (!event.urls || event.urls.length === 0) {
      this.showToast('error', 'Aucun fichier disponible.');
      return;
    }

    this.isDownloading.set(true);
    
    try {
      // Télécharger chaque fichier un par un
      event.urls.forEach((url, index) => {
        setTimeout(() => {
          const fileName = `${event.name}_${index + 1}`;
          this.documentService.downloadDocument(url, fileName);
        }, index * 500);
      });
      
      this.showToast('success', ` Téléchargement de ${event.urls.length} fichiers en cours...`);
    } catch (error) {
      console.error('❌ Error downloading:', error);
      this.showToast('error', 'Erreur lors du téléchargement.');
    } finally {
      setTimeout(() => {
        this.isDownloading.set(false);
      }, event.urls.length * 500 + 1000);
    }
  }

  /**
   * Simple document download - used for contracts and other places
   */
  downloadDocument(url: string, fileName?: string): void {
    if (!url) {
      this.showToast('error', 'Aucun fichier disponible.');
      return;
    }
    
    this.documentService.downloadDocument(url, fileName);
  }

  // ─── Documents ──────────────────────────────────────────────────────────
  telechargerDocument(url: string): void {
    if (url) {
      this.documentService.downloadDocument(url);
    }
  }

 

  telechargerContrat(): void {
    const actif = this.contratActif();
    if (actif?.imageUrls?.length > 0) {
      this.downloadDocument(actif.imageUrls[0], 'contrat_' + actif.typeContrat);
    } else if (actif) {
      this.showToast('info', 'Aucun fichier attaché à votre contrat actif.');
    } else {
      this.showToast('error', 'Aucun contrat actif trouvé.');
    }
  }

  // ─── Image Utilities ──────────────────────────────────────────────────
  
  /**
   * Get preview URL for a document
   */
  getDocumentPreviewUrl(documentId: string): string {
    return `${this.apiUrl}/documents-management/pieces/${documentId}/preview`;
  }

  /**
   * Check if document is an image
   */
  isImage(doc: any): boolean {
    const imageTypes = ['PHOTO', 'IMAGE', 'CNI'];
    const type = doc.typeDocument?.toUpperCase() || '';
    const name = doc.name?.toLowerCase() || '';
    
    if (imageTypes.some(t => type.includes(t) || type === t)) {
      return true;
    }
    
    if (doc.imageUrls && doc.imageUrls.length > 0) {
      const url = doc.imageUrls[0].toLowerCase();
      return url.endsWith('.jpg') || url.endsWith('.jpeg') || 
             url.endsWith('.png') || url.endsWith('.gif') || 
             url.endsWith('.webp') || url.endsWith('.svg') ||
             url.endsWith('.bmp');
    }
    
    return false;
  }

  // ─── Image Error Handler ────────────────────────────────────────────
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Cline x1="3" y1="15" x2="21" y2="15"/%3E%3Cline x1="3" y1="9" x2="21" y2="9"/%3E%3C/svg%3E';
    img.style.objectFit = 'contain';
    img.style.padding = '8px';
  }

  // ─── Mot de passe ──────────────────────────────────────────────────────
  ouvrirModalMotDePasse(): void {
    this.passwordForm.reset();
    this.showPasswordModal.set(true);
  }

  fermerModalMotDePasse(): void {
    this.showPasswordModal.set(false);
    this.passwordForm.reset();
  }

  changerMotDePasse(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.showToast('error', 'Veuillez corriger les erreurs.');
      return;
    }

    this.isSaving.set(true);
    const { nouveauMotDePasse } = this.passwordForm.value;

    if (this.currentUser?.id) {
      this.userService.updateUser(this.currentUser.id, {
        password: nouveauMotDePasse
      } as any).pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      ).subscribe({
        next: () => {
          this.showToast('success', '🔑 Mot de passe mis à jour avec succès !');
          this.fermerModalMotDePasse();
        },
        error: (err) => {
          console.error('Erreur changement mot de passe:', err);
          this.showToast('error', err.error?.message || 'Erreur lors du changement de mot de passe.');
        }
      });
    } else {
      this.isSaving.set(false);
      this.showToast('error', 'Utilisateur non identifié.');
    }
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────
  formatDate(dateStr: any): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return '—';
    }
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      'ACTIF': 'Actif',
      'SUSPENDU': 'Suspendu',
      'CONGE': 'En Congé',
      'ARCHIVE': 'Archivé'
    };
    return map[statut] || statut;
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'ACTIF': 'badge--actif',
      'SUSPENDU': 'badge--suspendu',
      'CONGE': 'badge--conge',
      'ARCHIVE': 'badge--archive'
    };
    return map[statut] || 'badge--default';
  }

  getTypeContratBadge(type: string): string {
    if (!type) return 'contrat--default';
    const t = type.toUpperCase();
    if (t.includes('CDI')) return 'contrat--cdi';
    if (t.includes('CDD')) return 'contrat--cdd';
    if (t.includes('STAGE')) return 'contrat--stage';
    if (t.includes('FREELANCE')) return 'contrat--freelance';
    return 'contrat--default';
  }

  getDocumentIcon(typeDoc: string): string {
    const map: Record<string, string> = {
      'CNI': '',
      'CERTIFICAT': '',
      'PHOTO': '',
      'DIPLOME': '',
      'CV': '',
      'PASSEPORT': '',
      'PERMIS': '',
      'ATTESTATION': '',
      'BULLETIN': ''
    };
    return map[typeDoc] || '';
  }

  getTypeDocumentLabel(typeDoc: string): string {
    const map: Record<string, string> = {
      'CNI': 'Carte d\'identité',
      'CERTIFICAT': 'Certificat',
      'PHOTO': 'Photo',
      'DIPLOME': 'Diplôme',
      'CV': 'Curriculum Vitae',
      'PASSEPORT': 'Passeport',
      'PERMIS': 'Permis de conduire',
      'ATTESTATION': 'Attestation',
      'BULLETIN': 'Bulletin de paie'
    };
    return map[typeDoc] || typeDoc;
  }

  private showToast(type: 'success' | 'error' | 'info', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 5000);
  }

  // ─── Getters ──────────────────────────────────────────────────────────
  get f() { return this.personalForm.controls; }
  get fp() { return this.passwordForm.controls; }
}