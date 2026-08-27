// src/app/features/rh/employes/employes.component.ts

import { Component, OnInit, signal, computed, effect, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { EmployeService } from '../../../core/services/employe.service';
import { DepartementService } from '../../../core/services/departement.service';
import { ContratService } from '../../../core/services/contrat.service';
import { DocumentService } from '../../../core/services/document.service';
import { RoleService } from '../../../core/services/role.service';
import { PostesService } from '../../../core/services/postes.service';
import { Poste } from '../../../core/models/poste.model';
import { environment } from '../../../../environments/environment';
import { PermissionService } from '../../../core/services/permission.service';
import { AuthService } from '../../../services/auth.service';
import { EntrepriseService } from '../../../core/services/entreprise.service';
import { Entreprise } from '../../../core/models/entreprise.model';
import { Departement } from '../../../core/models/departement.model';
import { catchError, of, switchMap, takeUntil } from 'rxjs';
import { TwoFactorAuthService } from '../../../core/services/two-factor-auth.service';
import { Subject } from 'rxjs';
import { TypeContrat, CONTRACT_TYPE_CONFIG, calculateTrialEndDate } from '../../../core/models/contrat.model';

@Component({
  selector: 'app-employes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './employes.html',
  styleUrls: ['./employes.css']
})
export class EmployesComponent implements OnInit, OnDestroy {

  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'access_token';
  private permissionService = inject(PermissionService);
  private authService = inject(AuthService);
  private twoFactorAuthService = inject(TwoFactorAuthService);

  private destroy$ = new Subject<void>();
  private twoFactorCheckQueue = new Set<string>();
  private twoFactorCheckTimeout: any = null;
  private isInitialLoadComplete = false;

  // Formulaires
  employeeForm!: FormGroup;
  contractForm!: FormGroup;
  avenantForm!: FormGroup;
  bulletinForm!: FormGroup;
  contratFormModal!: FormGroup;

  // Donnees brutes (signaux)
  employees = signal<any[]>([]);
  entreprises = signal<Entreprise[]>([]);
  departements = signal<Departement[]>([]);
  roles = signal<any[]>([]);
  postes = signal<Poste[]>([]);
  contrats = signal<any[]>([]);

  // Departements et postes filtres pour les selects du formulaire
  filteredDepartements = signal<Departement[]>([]);
  filteredPostes = signal<Poste[]>([]);

  // Signaux pour la recherche et le filtre
  searchTerm = signal<string>('');
  selectedDepartement = signal<string>('');

  // Signaux pour le filtrage par entreprise
  currentUserRole = signal<string>('');
  currentUserCompanyId = signal<string>('');
  currentUserCompanyName = signal<string>('');
  isDirection = signal<boolean>(false);
  companyFilter = signal<string>('');
  
  // Signal pour le chargement
  isLoading = signal<boolean>(false);
  loadingError = signal<string | null>(null);

  // Cache des departements par entreprise
  departementCache = new Map<string, string[]>();

  // Signaux pour le 2FA
  twoFactorStatus = signal<Record<string, boolean>>({});
  isToggling2FA = signal<Record<string, boolean>>({});
  show2FAModal = signal(false);
  selected2FAEmployee = signal<any | null>(null);
  twoFASecret = signal<string>('');
  twoFAQrCode = signal<string>('');
  twoFABackupCodes = signal<string[]>([]);
  twoFASetupStep = signal(1);
  twoFAVerificationCode = signal<string>('');
  twoFAError = signal<string | null>(null);

  // Signal pour le type de contrat selectionne (modale contrat)
  selectedContractType = signal<TypeContrat | null>(null);
  contractTypeConfig = signal<any | null>(null);

  // Signaux pour le contrat dans le wizard (étape 2)
  selectedContractTypeStep2 = signal<TypeContrat | null>(null);
  contractTypeConfigStep2 = signal<any | null>(null);

  // ========== SIGNAUX POUR L'HISTORIQUE ==========
  employeeHistory = signal<any>(null);
  isLoadingHistory = signal<boolean>(false);
  activeDetailTab = signal<'info' | 'contracts' | 'documents' | 'history'>('info');
  historyDownloadFormat = signal<'csv' | 'pdf'>('csv');

  // Computed : employes enrichis
  enrichedEmployees = computed(() => {
    const all = this.employees();
    const postes = this.postes();
    const roles = this.roles();
    const depts = this.departements();

    return all.map(emp => ({
      ...emp,
      nom: emp.nom || emp.name || '',
      prenom: emp.prenom || emp.prename || '',
      fullName: `${emp.prenom || emp.prename || ''} ${emp.nom || emp.name || ''}`.trim(),
      posteName: this.getPosteName(emp.posteId, postes),
      roleName: this.getRoleName(emp.roleId || emp.role, roles),
      departementName: this.getDepartementName(emp.departementId, depts),
      entrepriseId: this.getEntrepriseIdFromDepartement(emp.departementId, depts)
    }));
  });

  // Computed avec filtrage
  filteredEmployees = computed(() => {
    let enriched = this.enrichedEmployees();
    const search = this.searchTerm().toLowerCase().trim();
    const deptFilter = this.selectedDepartement();
    const isDirectionRole = this.isDirection();
    const companyId = this.companyFilter();

    if (isDirectionRole && companyId) {
      const deptIds = this.getDepartementIdsByEntreprise(companyId);
      if (deptIds.length > 0) {
        enriched = enriched.filter(emp => {
          const empDeptId = emp.departementId || emp.departementid;
          return deptIds.includes(empDeptId);
        });
      } else {
        enriched = [];
      }
    }

    if (!search && !deptFilter) {
      return enriched;
    }

    return enriched.filter(emp => {
      let match = true;

      if (search) {
        const matricule = (emp.matriculeInterne || '').toLowerCase();
        const nom = (emp.nom || emp.name || '').toLowerCase();
        const prenom = (emp.prenom || emp.prename || '').toLowerCase();
        const fullName = `${prenom} ${nom}`;
        const poste = (emp.posteName || '').toLowerCase();
        const departement = (emp.departementName || '').toLowerCase();
        const telephone = (emp.telephone || '').toLowerCase();
        const email = (emp.user?.email || emp.email || '').toLowerCase();

        const searchMatch = matricule.includes(search) ||
                            nom.includes(search) ||
                            prenom.includes(search) ||
                            fullName.includes(search) ||
                            poste.includes(search) ||
                            departement.includes(search) ||
                            telephone.includes(search) ||
                            email.includes(search);

        if (!searchMatch) {
          match = false;
        }
      }

      if (deptFilter && emp.departementId !== deptFilter) {
        match = false;
      }

      return match;
    });
  });

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 10;
  Math = Math;

  totalPages = computed(() => {
    const total = this.filteredEmployees().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedEmployees = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredEmployees().slice(startIndex, endIndex);
  });

  // Autres signaux
  selectedEmployee = signal<any | null>(null);
  activeEmployeeContracts = signal<any[]>([]);
  employeeDocuments = signal<any[]>([]);

  showEmployeeModal = signal(false);
  showAvenantModal = signal(false);
  showDocModal = signal(false);
  showBulletinModal = signal(false);
  showDetailModal = signal(false);
  showPreviewModal = signal(false);
  showContratModal = signal(false);
  isEditMode = signal(false);

  previewDocument = signal<any | null>(null);

  currentStep = signal(1);
  totalSteps = 3;
  stepsLabels = [
    { num: 1, label: 'Identite & Compte', icon: 'person' },
    { num: 2, label: 'Contrat & Scans', icon: 'contract' },
    { num: 3, label: 'Documents RH', icon: 'folder_copy' }
  ];

  // Fichiers
  contratScanFiles: File[] = [];
  cniFiles: File[] = [];
  diplomeFiles: File[] = [];
  photoFiles: File[] = [];
  certificatFiles: File[] = [];
  docFiles: File[] = [];
  bulletinFiles: File[] = [];
  contratFiles: File[] = [];
  documentType: string = 'CNI';

  // Permissions
  canViewAllEmployees = signal(false);
  canViewEmployee = signal(false);
  canCreateEmployee = signal(false);
  canUpdateEmployee = signal(false);
  canDeleteEmployee = signal(false);
  canSuspendEmployee = signal(false);
  canReactivateEmployee = signal(false);
  canUploadDocuments = signal(false);
  canViewDocuments = signal(false);
  canCreatePayroll = signal(false);
  canCreateAvenant = signal(false);

  constructor(
    private employeService: EmployeService,
    private departementService: DepartementService,
    private contratService: ContratService,
    private documentService: DocumentService,
    private roleService: RoleService,
    private postesService: PostesService,
    private entrepriseService: EntrepriseService,
    private fb: FormBuilder
  ) {
    this.initForms();
    this.initContratModalForm();

    // Effet pour la pagination
    effect(() => {
      this.filteredEmployees();
      this.currentPage.set(1);
    });

    // Effet pour verifier les statuts 2FA
    effect(() => {
      const employees = this.paginatedEmployees();
      if (employees.length > 0 && this.canManage2FA() && this.isInitialLoadComplete) {
        this.scheduleTwoFactorCheck(employees);
      }
    });
  }

  ngOnInit(): void {
    console.log('Initialisation du composant Employes');

    const user = this.authService.getCurrentUser();
    console.log('Utilisateur connecte:', user);
    
    this.initializeUserRole(user);
    this.loadPermissions();
    this.loadInitialData();
    
    setTimeout(() => {
      this.loadEmployeesBasedOnRole();
      this.isInitialLoadComplete = true;
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.twoFactorCheckTimeout) {
      clearTimeout(this.twoFactorCheckTimeout);
    }
  }

  // ========== MÉTHODE DE VÉRIFICATION D'EXPIRATION ==========
  /**
   * Vérifie si un contrat expire dans les 14 prochains jours.
   * @param contract L'objet contrat
   * @returns true si la date de fin est dans les 14 jours à compter d'aujourd'hui, false sinon
   */
  isContractExpiring(contract: any): boolean {
    if (!contract || !contract.dateFin) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(contract.dateFin);
    endDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  }

  // ========================================================================
  // CONFIGURATION CONTRAT AVEC SURCHARGES
  // ========================================================================

  /**
   * Retourne la configuration du type de contrat en appliquant les surcharges métier :
   * - CDI : pas de date de fin, pas de période d'essai
   * - CDD : pas de période d'essai (car déjà un type ESSAI)
   * - ESSAI : permet le renouvellement
   */
  private getAdjustedConfig(type: TypeContrat): any {
    const base = CONTRACT_TYPE_CONFIG[type];
    if (!base) return null;
    const config = { ...base };
    if (type === 'CDI') {
      config.hasEndDate = false;
      config.requiresTrialPeriod = false;
    } else if (type === 'CDD') {
      config.requiresTrialPeriod = false;
    } else if (type === 'ESSAI') {
      config.showRenewable = true;
    }
    return config;
  }

  initForms(): void {
    this.employeeForm = this.fb.group({
      id: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roleId: ['', Validators.required],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      matriculeInterne: ['', Validators.required],
      matricule_CNPS: [''],
      sexe: ['M', Validators.required],
      date_naissance: ['', Validators.required],
      telephone: ['', Validators.required],
      numeroContactUrgence: [''],
      addresse: ['', Validators.required],
      date_embauche: ['', Validators.required],
      posteId: ['', Validators.required],
      departementId: ['', Validators.required],
      entrepriseId: ['', Validators.required]
    });

    this.contractForm = this.fb.group({
      typeContrat: ['CDI', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: [null],
      statut: ['ACTIF', Validators.required],
      salaireBrut: [null],
      salaireNet: [null],
      tauxHoraire: [null],
      nombreHeuresSemaine: [null],
      dateFinEssai: [null],
      dureeEssaiMois: [null],
      motifRecours: [''],
      dureeMois: [null],
      etablissement: [''],
      tuteurNom: [''],
      tuteurEmail: [''],
      tuteurTelephone: [''],
      objectifsStage: [''],
      dureeSemaines: [null],
      descriptionPrestation: [''],
      modalitesPaiement: [''],
      dureeMoisPrestation: [null],
      estRenouvelable: [false],
      renouvellementMax: [null],
      observations: ['']
    });

    const defaultType = 'CDI' as TypeContrat;
    this.selectedContractTypeStep2.set(defaultType);
    this.contractTypeConfigStep2.set(this.getAdjustedConfig(defaultType));
    this.updateContractFormValidatorsStep2(defaultType);

    this.avenantForm = this.fb.group({
      employeId: ['', Validators.required],
      typeContrat: ['CDI', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: [null],
      statut: ['ACTIF', Validators.required]
    });

    this.bulletinForm = this.fb.group({
      employeId: ['', Validators.required],
      mois: ['', Validators.required],
      annee: [new Date().getFullYear(), Validators.required],
      montantNet: ['', Validators.required]
    });
  }

  initContratModalForm(): void {
    this.contratFormModal = this.fb.group({
      employeeId: ['', Validators.required],
      typeContrat: ['CDI', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: [''],
      dateFinEssai: [''],
      dureeEssaiMois: [null],
      statut: ['ACTIF', Validators.required],
      salaireBrut: [null],
      salaireNet: [null],
      tauxHoraire: [null],
      nombreHeuresSemaine: [null],
      motifRecours: [''],
      dureeMois: [null],
      etablissement: [''],
      tuteurNom: [''],
      tuteurEmail: ['', Validators.email],
      tuteurTelephone: [''],
      objectifsStage: [''],
      dureeSemaines: [null],
      descriptionPrestation: [''],
      modalitesPaiement: [''],
      dureeMoisPrestation: [null],
      estRenouvelable: [false],
      renouvellementMax: [null],
      observations: ['']
    });

    this.contratFormModal.get('typeContrat')?.valueChanges.subscribe((type: string) => {
      this.updateContractFormValidators(type as TypeContrat);
    });

    this.contratFormModal.get('dureeEssaiMois')?.valueChanges.subscribe((dureeMois: number) => {
      this.onDureeEssaiChange();
    });

    this.contratFormModal.get('dateDebut')?.valueChanges.subscribe(() => {
      this.onDureeEssaiChange();
    });

    const defaultType = 'CDI' as TypeContrat;
    this.selectedContractType.set(defaultType);
    this.contractTypeConfig.set(this.getAdjustedConfig(defaultType));
    this.updateContractFormValidators(defaultType);
  }

  onDureeEssaiChange(): void {
    const dureeMois = this.contratFormModal.get('dureeEssaiMois')?.value;
    const dateDebut = this.contratFormModal.get('dateDebut')?.value;
    
    if (dateDebut && dureeMois && dureeMois > 0) {
      const finEssai = calculateTrialEndDate(dateDebut, dureeMois);
      if (finEssai) {
        this.contratFormModal.patchValue({
          dateFinEssai: finEssai
        }, { emitEvent: false });
      }
    } else {
      if (dureeMois === 0 || dureeMois === null) {
        this.contratFormModal.patchValue({
          dateFinEssai: ''
        }, { emitEvent: false });
      }
    }
  }

  onDureeEssaiChangeStep2(): void {
    const dureeMois = this.contractForm.get('dureeEssaiMois')?.value;
    const dateDebut = this.contractForm.get('dateDebut')?.value;
    
    if (dateDebut && dureeMois && dureeMois > 0) {
      const finEssai = calculateTrialEndDate(dateDebut, dureeMois);
      if (finEssai) {
        this.contractForm.patchValue({
          dateFinEssai: finEssai
        }, { emitEvent: false });
      }
    } else {
      if (dureeMois === 0 || dureeMois === null) {
        this.contractForm.patchValue({
          dateFinEssai: ''
        }, { emitEvent: false });
      }
    }
  }

  private updateContractFormValidators(type: TypeContrat): void {
    const config = this.getAdjustedConfig(type);
    if (!config) return;

    this.selectedContractType.set(type);
    this.contractTypeConfig.set(config);

    const form = this.contratFormModal;

    const statutControl = form.get('statut');
    if (type === 'ESSAI') {
      statutControl?.setValue('EN_ESSAI', { emitEvent: false });
      statutControl?.disable({ emitEvent: false });
    } else {
      statutControl?.enable({ emitEvent: false });
      if (statutControl?.value === 'EN_ESSAI') {
        statutControl?.setValue('ACTIF', { emitEvent: false });
      }
    }

    const dateFinControl = form.get('dateFin');
    if (config.hasEndDate) {
      dateFinControl?.setValidators([Validators.required]);
    } else {
      dateFinControl?.clearValidators();
    }
    dateFinControl?.updateValueAndValidity();

    const dureeEssaiControl = form.get('dureeEssaiMois');
    const dateFinEssaiControl = form.get('dateFinEssai');
    if (config.requiresTrialPeriod) {
      dureeEssaiControl?.setValidators([Validators.min(0), Validators.max(6)]);
      dateFinEssaiControl?.clearValidators();
      dureeEssaiControl?.enable({ emitEvent: false });
    } else {
      dureeEssaiControl?.clearValidators();
      dateFinEssaiControl?.clearValidators();
      dureeEssaiControl?.setValue(null);
      dateFinEssaiControl?.setValue('');
      dureeEssaiControl?.disable({ emitEvent: false });
    }
    dureeEssaiControl?.updateValueAndValidity();
    dateFinEssaiControl?.updateValueAndValidity();

    const salaireControl = form.get('salaireBrut');
    if (config.requiresSalary) {
      salaireControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      salaireControl?.clearValidators();
    }
    salaireControl?.updateValueAndValidity();

    const motifControl = form.get('motifRecours');
    if (config.requiresMotifRecours) {
      motifControl?.setValidators([Validators.required]);
    } else {
      motifControl?.clearValidators();
    }
    motifControl?.updateValueAndValidity();

    const etablissementControl = form.get('etablissement');
    if (config.requiresEtablissement) {
      etablissementControl?.setValidators([Validators.required]);
    } else {
      etablissementControl?.clearValidators();
    }
    etablissementControl?.updateValueAndValidity();

    const tuteurControl = form.get('tuteurNom');
    if (config.requiresTuteur) {
      tuteurControl?.setValidators([Validators.required]);
    } else {
      tuteurControl?.clearValidators();
    }
    tuteurControl?.updateValueAndValidity();

    const prestationControl = form.get('descriptionPrestation');
    if (config.requiresPrestationDescription) {
      prestationControl?.setValidators([Validators.required]);
    } else {
      prestationControl?.clearValidators();
    }
    prestationControl?.updateValueAndValidity();
  }

  isContractType(type: string): boolean {
    return this.contratFormModal.get('typeContrat')?.value === type;
  }

  onContractTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value as TypeContrat;
    this.updateContractFormValidators(type);
  }

  isContractTypeStep2(): any {
    return this.contractTypeConfigStep2();
  }

  onContractTypeChangeStep2(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value as TypeContrat;
    const config = this.getAdjustedConfig(type);
    this.selectedContractTypeStep2.set(type);
    this.contractTypeConfigStep2.set(config);
    this.updateContractFormValidatorsStep2(type);
  }

  private updateContractFormValidatorsStep2(type: TypeContrat): void {
    const config = this.getAdjustedConfig(type);
    if (!config) return;

    const form = this.contractForm;

    const statutControl = form.get('statut');
    if (type === 'ESSAI') {
      statutControl?.setValue('EN_ESSAI', { emitEvent: false });
      statutControl?.disable({ emitEvent: false });
    } else {
      statutControl?.enable({ emitEvent: false });
      if (statutControl?.value === 'EN_ESSAI') {
        statutControl?.setValue('ACTIF', { emitEvent: false });
      }
    }

    const dateFinControl = form.get('dateFin');
    if (config.hasEndDate) {
      dateFinControl?.setValidators([Validators.required]);
    } else {
      dateFinControl?.clearValidators();
    }
    dateFinControl?.updateValueAndValidity();

    const dureeEssaiControl = form.get('dureeEssaiMois');
    const dateFinEssaiControl = form.get('dateFinEssai');
    if (config.requiresTrialPeriod) {
      dureeEssaiControl?.setValidators([Validators.min(0), Validators.max(6)]);
      dateFinEssaiControl?.clearValidators();
      dureeEssaiControl?.enable({ emitEvent: false });
    } else {
      dureeEssaiControl?.clearValidators();
      dateFinEssaiControl?.clearValidators();
      dureeEssaiControl?.setValue(null);
      dateFinEssaiControl?.setValue('');
      dureeEssaiControl?.disable({ emitEvent: false });
    }
    dureeEssaiControl?.updateValueAndValidity();
    dateFinEssaiControl?.updateValueAndValidity();

    const salaireControl = form.get('salaireBrut');
    if (config.requiresSalary) {
      salaireControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      salaireControl?.clearValidators();
    }
    salaireControl?.updateValueAndValidity();

    const motifControl = form.get('motifRecours');
    if (config.requiresMotifRecours) {
      motifControl?.setValidators([Validators.required]);
    } else {
      motifControl?.clearValidators();
    }
    motifControl?.updateValueAndValidity();

    const etablissementControl = form.get('etablissement');
    if (config.requiresEtablissement) {
      etablissementControl?.setValidators([Validators.required]);
    } else {
      etablissementControl?.clearValidators();
    }
    etablissementControl?.updateValueAndValidity();

    const tuteurControl = form.get('tuteurNom');
    if (config.requiresTuteur) {
      tuteurControl?.setValidators([Validators.required]);
    } else {
      tuteurControl?.clearValidators();
    }
    tuteurControl?.updateValueAndValidity();

    const prestationControl = form.get('descriptionPrestation');
    if (config.requiresPrestationDescription) {
      prestationControl?.setValidators([Validators.required]);
    } else {
      prestationControl?.clearValidators();
    }
    prestationControl?.updateValueAndValidity();
  }

  // ========================================================================
  // Initialisation et chargement des données
  // ========================================================================

  private initializeUserRole(user: any): void {
    const role = user?.role || '';
    const roles = user?.roles || [];
    
    this.currentUserRole.set(role);

    const isDirectionRole = role === 'DIRECTION' || 
                           roles.includes('DIRECTION') ||
                           role === 'DIRECTION_GENERALE' ||
                           roles.includes('DIRECTION_GENERALE') ||
                           role === 'DIRECTOR' ||
                           roles.includes('DIRECTOR');

    this.isDirection.set(isDirectionRole);

    const userCompanyId = user?.entrepriseId || 
                         user?.companyId || 
                         user?.entreprise?.id || 
                         user?.entreprise?.id;

    if (userCompanyId) {
      this.currentUserCompanyId.set(userCompanyId);
      this.companyFilter.set(userCompanyId);
    }

    console.log('Role utilisateur:', role);
    console.log('isDirection:', isDirectionRole);
  }

  private loadPermissions(): void {
    console.log('Chargement des permissions Employes...');
    
    const user = this.authService.getCurrentUser();
    const hasWildcard = user?.permissions?.includes('*') === true;
    const isSystemAdmin = this.permissionService.hasPermissionSync('SYSTEM_ADMIN');

    this.canViewAllEmployees.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_VIEW_ALL')
    );
    
    this.canViewEmployee.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_VIEW')
    );
    
    this.canCreateEmployee.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_CREATE')
    );
    
    this.canUpdateEmployee.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_UPDATE')
    );
    
    this.canDeleteEmployee.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_DELETE')
    );
    
    this.canSuspendEmployee.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_SUSPEND')
    );
    
    this.canReactivateEmployee.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('EMPLOYEE_REACTIVATE')
    );
    
    this.canUploadDocuments.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('DOC_UPLOAD')
    );
    
    this.canViewDocuments.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('DOC_VIEW_ALL')
    );
    
    this.canCreatePayroll.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('PAYSLIP_CREATE')
    );
    
    this.canCreateAvenant.set(
      hasWildcard || 
      isSystemAdmin || 
      this.permissionService.hasPermissionSync('CONTRACT_CREATE')
    );

    console.log('Permissions Employes chargees');
  }

  canManage2FA(): boolean {
    const user = this.authService.getCurrentUser();
    const hasWildcard = user?.permissions?.includes('*') === true;
    const isSystemAdmin = this.permissionService.hasPermissionSync('SYSTEM_ADMIN');
    const has2FAAdmin = this.permissionService.hasPermissionSync('2FA_ADMIN');
    
    return hasWildcard || isSystemAdmin || has2FAAdmin;
  }

  private scheduleTwoFactorCheck(employees: any[]): void {
    if (this.twoFactorCheckTimeout) {
      clearTimeout(this.twoFactorCheckTimeout);
    }

    this.twoFactorCheckTimeout = setTimeout(() => {
      const employeesToCheck = employees.filter(emp => {
        const empId = emp.id || emp._id;
        return empId && !this.twoFactorStatus()[empId] && !this.twoFactorCheckQueue.has(empId);
      });

      employeesToCheck.forEach(emp => {
        const empId = emp.id || emp._id;
        this.twoFactorCheckQueue.add(empId);
      });

      this.processTwoFactorCheckQueue();
    }, 1000);
  }

  private processTwoFactorCheckQueue(): void {
    const queueItems = Array.from(this.twoFactorCheckQueue);
    
    if (queueItems.length === 0) return;

    const batchSize = 5;
    const batch = queueItems.slice(0, batchSize);

    batch.forEach((employeeId, index) => {
      setTimeout(() => {
        this.checkTwoFactorStatus(employeeId);
        this.twoFactorCheckQueue.delete(employeeId);
      }, index * 500);
    });

    if (queueItems.length > batchSize) {
      setTimeout(() => {
        this.processTwoFactorCheckQueue();
      }, queueItems.length * 500);
    }
  }

  checkTwoFactorStatus(employeeId: string): void {
    if (!employeeId || !this.canManage2FA()) return;
    
    const employee = this.employees().find(e => e.id === employeeId || e._id === employeeId);
    if (!employee) {
      return;
    }
    
    const userId = employee.userId || employee.user?.id || employee.user_id;
    if (!userId) {
      this.twoFactorStatus.update(status => ({
        ...status,
        [employeeId]: false
      }));
      return;
    }
    
    this.twoFactorAuthService.getTwoFactorStatus(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enabled) => {
          this.twoFactorStatus.update(status => ({
            ...status,
            [employeeId]: enabled
          }));
        },
        error: () => {
          this.twoFactorStatus.update(status => ({
            ...status,
            [employeeId]: false
          }));
        }
      });
  }

  // ========================================================================
  // MÉTHODES 2FA
  // ========================================================================

  open2FAModal(employee: any): void {
    if (!this.canManage2FA()) {
      alert('Vous n\'avez pas la permission de gerer le 2FA.');
      return;
    }

    if (!employee || !employee.id) {
      alert('Employe invalide.');
      return;
    }

    const userId = employee.userId || employee.user?.id || employee.user_id;
    if (!userId) {
      alert('Cet employe n\'a pas de compte utilisateur associe. Veuillez d\'abord creer un compte utilisateur.');
      return;
    }

    this.selected2FAEmployee.set(employee);
    this.twoFASetupStep.set(1);
    this.twoFAVerificationCode.set('');
    this.twoFASecret.set('');
    this.twoFAQrCode.set('');
    this.twoFABackupCodes.set([]);
    this.twoFAError.set(null);

    this.twoFactorAuthService.getTwoFactorStatus(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enabled) => {
          if (enabled) {
            this.twoFASetupStep.set(3);
          } else {
            this.twoFASetupStep.set(0);
          }
          this.show2FAModal.set(true);
        },
        error: () => {
          this.twoFASetupStep.set(0);
          this.show2FAModal.set(true);
        }
      });
  }

  initiateTwoFactorForEmployee(): void {
    const employee = this.selected2FAEmployee();
    if (!employee) return;
    const userId = employee.userId || employee.user?.id || employee.user_id;
    if (!userId) return;

    const employeeId = employee.id;
    this.isToggling2FA.update(status => ({
      ...status,
      [employeeId]: true
    }));

    this.twoFactorAuthService.initiateTwoFactor(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isToggling2FA.update(status => ({
            ...status,
            [employeeId]: false
          }));
          this.twoFASetupStep.set(4);
          this.twoFAError.set(null);
        },
        error: (err) => {
          this.isToggling2FA.update(status => ({
            ...status,
            [employeeId]: false
          }));
          this.twoFAError.set(err.error?.error || 'Erreur lors de l\'initiation');
        }
      });
  }

  generate2FASecret(userId: string): void {
    this.twoFactorAuthService.generateTwoFactorSecret(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.twoFASecret.set(response.secret);
          this.twoFAQrCode.set(response.qrCodeUrl);
          this.twoFABackupCodes.set(response.backupCodes);
          this.twoFASetupStep.set(2);
          this.twoFAError.set(null);
        },
        error: (err) => {
          console.error('Erreur generation secret 2FA:', err);
          this.twoFAError.set('Erreur lors de la generation du code 2FA. Veuillez reessayer.');
        }
      });
  }

  enableTwoFactorForEmployee(userId: string): void {
    const code = this.twoFAVerificationCode();
    
    if (!code || code.length !== 6) {
      this.twoFAError.set('Veuillez entrer un code a 6 chiffres valide.');
      return;
    }

    const otpCode = parseInt(code, 10);
    if (isNaN(otpCode)) {
      this.twoFAError.set('Veuillez entrer un code numerique valide.');
      return;
    }

    const employeeId = this.selected2FAEmployee()?.id;
    this.isToggling2FA.update(status => ({
      ...status,
      [employeeId]: true
    }));

    this.twoFactorAuthService.verifyAndEnableTwoFactor(userId, otpCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.twoFactorStatus.update(status => ({
            ...status,
            [employeeId]: true
          }));
          
          this.isToggling2FA.update(status => ({
            ...status,
            [employeeId]: false
          }));
          
          this.show2FAModal.set(false);
          alert('2FA active avec succes pour ' + this.selected2FAEmployee()?.prenom + ' ' + this.selected2FAEmployee()?.nom);
          this.selected2FAEmployee.set(null);
        },
        error: (err) => {
          console.error('Erreur activation 2FA:', err);
          this.twoFAError.set('Code invalide. Veuillez reessayer.');
          this.isToggling2FA.update(status => ({
            ...status,
            [employeeId]: false
          }));
        }
      });
  }

  disableTwoFactorForEmployee(userId: string): void {
    const employee = this.selected2FAEmployee();
    if (!confirm('Etes-vous sur de vouloir desactiver le 2FA pour ' + employee?.prenom + ' ' + employee?.nom + ' ?')) {
      return;
    }

    const employeeId = employee?.id;
    this.isToggling2FA.update(status => ({
      ...status,
      [employeeId]: true
    }));

    this.twoFactorAuthService.disableTwoFactor(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.twoFactorStatus.update(status => ({
            ...status,
            [employeeId]: false
          }));
          
          this.isToggling2FA.update(status => ({
            ...status,
            [employeeId]: false
          }));
          
          this.show2FAModal.set(false);
          alert('2FA desactive avec succes pour ' + employee?.prenom + ' ' + employee?.nom);
          this.selected2FAEmployee.set(null);
        },
        error: (err) => {
          console.error('Erreur desactivation 2FA:', err);
          this.twoFAError.set('Erreur lors de la desactivation du 2FA. Veuillez reessayer.');
          this.isToggling2FA.update(status => ({
            ...status,
            [employeeId]: false
          }));
        }
      });
  }

  close2FAModal(): void {
    this.show2FAModal.set(false);
    this.selected2FAEmployee.set(null);
    this.twoFASecret.set('');
    this.twoFAQrCode.set('');
    this.twoFABackupCodes.set([]);
    this.twoFAVerificationCode.set('');
    this.twoFAError.set(null);
  }

  onlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  // ========================================================================
  // CHARGEMENT DES DONNÉES
  // ========================================================================

  private loadInitialData(): void {
    this.loadEntreprises();
    this.loadPostes();
    this.loadDepartements();
    this.loadContrats();
    this.loadRolesWithFallback();
  }

  private loadRolesWithFallback(): void {
    this.roleService.getAll()
      .pipe(
        catchError((error) => {
          console.warn('Erreur chargement des roles, utilisation des roles par defaut');
          return of([
            { id: '1', name: 'RH / Admin' },
            { id: '2', name: 'Collaborateur' },
            { id: '3', name: 'Manager' },
            { id: '4', name: 'Direction' },
            { id: '5', name: 'Super Admin' },
            { id: '6', name: 'TOP_MANAGER' }
          ]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any[]) => {
          console.log('Roles charges:', data.length);
          this.roles.set(data);
        }
      });
  }

  private loadEmployeesBasedOnRole(): void {
    const user = this.authService.getCurrentUser();
    const isDirectionRole = this.isDirection();
    const existingCompanyId = this.currentUserCompanyId();

    this.isLoading.set(true);
    this.loadingError.set(null);

    const hasViewAll = this.canViewAllEmployees();

    if (hasViewAll) {
      this.loadAllEmployees();
      return;
    }

    if (isDirectionRole) {
      if (existingCompanyId) {
        this.loadEmployeesByCompanyId(existingCompanyId);
        return;
      }

      const userId = user?.id || user?.id;
      const userEmail = user?.email || user?.username;
      
      if (userId) {
        this.entrepriseService.getMyEntreprise(userId)
          .pipe(
            catchError(error => {
              if (userEmail) {
                return this.findCompanyByUserEmail(userEmail);
              }
              return of(null);
            }),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (entreprise) => {
              if (entreprise && entreprise.id) {
                this.handleCompanyFound(entreprise);
              } else {
                this.loadAllEmployees();
              }
            },
            error: () => this.loadAllEmployees()
          });
        return;
      }
      
      if (userEmail) {
        this.findCompanyByUserEmail(userEmail)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (entreprise) => {
              if (entreprise && entreprise.id) {
                this.handleCompanyFound(entreprise);
              } else {
                this.loadAllEmployees();
              }
            },
            error: () => this.loadAllEmployees()
          });
        return;
      }
    }

    this.loadAllEmployees();
  }

  private handleCompanyFound(entreprise: any): void {
    const companyId = entreprise.id || entreprise.id;
    if (companyId) {
      this.currentUserCompanyId.set(companyId);
      this.companyFilter.set(companyId);
      this.currentUserCompanyName.set(entreprise.name || entreprise.nom || '');
      this.loadEmployeesByCompanyId(companyId);
    } else {
      this.loadAllEmployees();
    }
  }

  private findCompanyByUserEmail(email?: string) {
    if (!email) return of(null);
    return this.entrepriseService.getAll().pipe(
      switchMap(enterprises => {
        const company = enterprises.find(e => {
          return e.email === email || 
                 (e as any).contactEmail === email ||
                 (e as any).managerEmail === email;
        });
        return of(company || null);
      }),
      catchError(() => of(null))
    );
  }

  private getDepartementIdsByEntreprise(entrepriseId: string): string[] {
    if (this.departementCache.has(entrepriseId)) {
      return this.departementCache.get(entrepriseId) || [];
    }

    const depts = this.departements().filter(d => 
      d.entrepriseId === entrepriseId || 
      (d as any).entrepriseid === entrepriseId
    );

    const deptIds = depts.map(d => d.id || (d as any).id).filter(id => id);
    this.departementCache.set(entrepriseId, deptIds);
    return deptIds;
  }

  private getEntrepriseIdFromDepartement(departementId: string, deptsList: Departement[] = this.departements()): string | null {
    if (!departementId) return null;
    const dept = deptsList.find(d => d.id === departementId || (d as any).id === departementId);
    return dept ? (dept.entrepriseId || (dept as any).entrepriseid || null) : null;
  }

  private loadEmployeesByCompanyId(companyId: string): void {
    this.departementService.getByEntreprise(companyId)
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (departements: Departement[]) => {
          if (departements.length === 0) {
            this.employees.set([]);
            this.isLoading.set(false);
            return;
          }

          const deptIds = departements.map(d => d.id || (d as any).id).filter(id => id);
          this.departementCache.set(companyId, deptIds);

          this.employeService.getAll()
            .pipe(
              catchError(() => of([])),
              takeUntil(this.destroy$)
            )
            .subscribe({
              next: (employees: any[]) => {
                const filtered = employees.filter(emp => {
                  const empDeptId = emp.departementId || emp.departementid;
                  return deptIds.includes(empDeptId);
                });
                
                const mapped = filtered.map(emp => ({
                  ...emp,
                  id: emp.id || emp.id,
                  departementId: emp.departementId || emp.departementid,
                  entrepriseId: companyId
                }));
                
                // Tri du plus récent au plus ancien
                const sorted = this.sortEmployeesByDate(mapped);
                this.employees.set(sorted);
                this.isLoading.set(false);
              },
              error: () => this.loadAllEmployees()
            });
        },
        error: () => this.loadAllEmployees()
      });
  }

  private loadAllEmployees(): void {
    this.employeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          const mapped = data.map(emp => ({
            ...emp,
            id: emp.id || emp.id,
            departementId: emp.departementId || emp.departementid
          }));
          // Tri du plus récent au plus ancien
          const sorted = this.sortEmployeesByDate(mapped);
          this.employees.set(sorted);
          this.isLoading.set(false);
          this.loadingError.set(null);
        },
        error: (err: any) => {
          console.error('Erreur chargement employes:', err);
          this.employees.set([]);
          this.loadingError.set('Erreur lors du chargement des employes');
          this.isLoading.set(false);
        }
      });
  }

  /**
   * Trie une liste d'employés par date de création décroissante (du plus récent au plus ancien).
   * Si createdAt n'est pas présent, utilise date_embauche, puis l'id en dernier recours.
   */
  private sortEmployeesByDate(employees: any[]): any[] {
    return [...employees].sort((a, b) => {
      // Fonction pour extraire une date valide
      const getDate = (emp: any): Date => {
        if (emp.createdAt) {
          const d = new Date(emp.createdAt);
          if (!isNaN(d.getTime())) return d;
        }
        if (emp.date_embauche) {
          const d = new Date(emp.date_embauche);
          if (!isNaN(d.getTime())) return d;
        }
        // Fallback : utiliser l'id (ObjectId contient un timestamp)
        if (emp.id) {
          // Pour les ObjectId MongoDB, on peut extraire le timestamp
          try {
            const timestamp = parseInt(emp.id.substring(0, 8), 16) * 1000;
            return new Date(timestamp);
          } catch {
            // ignore
          }
        }
        return new Date(0); // date très ancienne
      };

      const dateA = getDate(a);
      const dateB = getDate(b);
      return dateB.getTime() - dateA.getTime(); // décroissant
    });
  }

  loadEntreprises(): void {
    this.entrepriseService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Entreprise[]) => {
          this.entreprises.set(data);
        },
        error: () => this.entreprises.set([])
      });
  }

  loadDepartements(): void {
    this.departementService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Departement[]) => {
          this.departements.set(data || []);
          this.departementCache.clear();
          if (this.employeeForm?.get('entrepriseId')?.value) {
            this.loadDepartementsByEntreprise(this.employeeForm.get('entrepriseId')?.value);
          } else {
            this.filteredDepartements.set(data);
          }
        },
        error: () => this.departements.set([])
      });
  }

  loadContrats(): void {
    this.contratService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => this.contrats.set(data || []),
        error: () => this.contrats.set([])
      });
  }

  loadPostes(): void {
    this.isLoading.set(true);
    this.postesService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Poste[]) => {
          console.log('Postes charges depuis le backend:', data.length);
          this.postes.set(data);
          this.filteredPostes.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement postes:', err);
          this.postes.set([]);
          this.filteredPostes.set([]);
          this.isLoading.set(false);
        }
      });
  }

  filterPostesByDepartement(departementId: string): void {
    if (!departementId) {
      this.filteredPostes.set(this.postes());
      return;
    }

    const filtered = this.postes().filter(p => {
      const dept = (p as any).departement;
      
      if (dept && dept.id) {
        return dept.id === departementId || dept.id.toString() === departementId;
      }
      
      if (dept && dept.$id) {
        return dept.$id === departementId || dept.$id.toString() === departementId;
      }
      
      if ((p as any).departementId) {
        return (p as any).departementId === departementId;
      }
      
      if (dept && dept._id) {
        return dept._id === departementId || dept._id.toString() === departementId;
      }
      
      return false;
    });

    if (filtered.length > 0) {
      this.filteredPostes.set(filtered);
    } else {
      this.filteredPostes.set(this.postes());
    }
  }

  loadPostesByDepartement(departementId: string): void {
    this.filterPostesByDepartement(departementId);
  }

  loadAllPostes(): void {
    this.filteredPostes.set(this.postes());
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onDepartementFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedDepartement.set(select.value);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedDepartement.set('');
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  clearFilter(): void {
    this.selectedDepartement.set('');
  }

  applyFilters(): void {
    // Les filtres sont reactifs
  }

  onEntrepriseChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const entrepriseId = select.value;
    this.employeeForm.patchValue({ entrepriseId });
    this.loadDepartementsByEntreprise(entrepriseId);
    this.employeeForm.patchValue({ departementId: '', posteId: '' });
    this.filteredPostes.set(this.postes());
  }

  onDepartementChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const departementId = select.value;
    this.employeeForm.patchValue({ departementId });
    this.filterPostesByDepartement(departementId);
  }

  loadDepartementsByEntreprise(entrepriseId: string): void {
    if (!entrepriseId) {
      this.filteredDepartements.set([]);
      return;
    }
    this.isLoading.set(true);
    this.departementService.getByEntreprise(entrepriseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Departement[]) => {
          this.filteredDepartements.set(data);
          if (!this.employeeForm.get('departementId')?.value) {
            this.employeeForm.patchValue({ departementId: '' });
          }
          this.filteredPostes.set(this.postes());
          this.employeeForm.patchValue({ posteId: '' });
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement departements:', err);
          this.filteredDepartements.set([]);
          this.isLoading.set(false);
        }
      });
  }

  getPosteName(posteId: string, postesList: Poste[] = this.postes()): string {
    if (!posteId) return 'Non defini';
    const poste = postesList.find((p: Poste) => p.id === posteId || p.code === posteId);
    return poste ? (poste.libelle || poste.code || 'Poste non trouve') : 'Poste non trouve';
  }

  getRoleName(roleId: string, rolesList: any[] = this.roles()): string {
    if (!roleId) return 'Non defini';
    const role = rolesList.find(r => r.id === roleId || r.id === roleId);
    return role ? (role.name || role.nom || 'Role') : 'Non defini';
  }

  getDepartementName(deptId: string, deptsList: Departement[] = this.departements()): string {
    if (!deptId) return 'Non Assigne';
    const dept = deptsList.find(d => d.id === deptId);
    return dept ? (dept.name || 'Non Assigne') : 'Non Assigne';
  }

  totalFiles(): number {
    return this.contratScanFiles.length + this.cniFiles.length +
           this.diplomeFiles.length + this.photoFiles.length + this.certificatFiles.length;
  }

  private getToken(): string | null {
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      token = localStorage.getItem('token');
    }
    return token;
  }

  getDocumentPreviewUrlWithToken(documentId: string): string {
    if (!documentId) return '';
    const token = this.getToken();
    const baseUrl = `${this.apiUrl}/documents-management/pieces/${documentId}/preview`;
    if (token) {
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    }
    return baseUrl;
  }

  getDocumentDownloadUrlWithToken(documentId: string): string {
    if (!documentId) return '';
    const token = this.getToken();
    const baseUrl = `${this.apiUrl}/documents-management/pieces/${documentId}/file`;
    if (token) {
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    }
    return baseUrl;
  }

  getDocumentIcon(typeDoc: string): string {
    const map: Record<string, string> = {
      'CNI': '🪪',
      'CERTIFICAT': '📜',
      'PHOTO': '📸',
      'DIPLOME': '🎓',
      'CV': '📄',
      'PASSEPORT': '🛂',
      'PERMIS': '🚗',
      'ATTESTATION': '📋',
      'BULLETIN': '📊',
      'BULLETIN_PAIE': '📊',
      'CONTRAT_SIGNE': '📄',
      'AUTRE': '📎'
    };
    return map[typeDoc] || '📄';
  }

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

  openDocumentPreview(doc: any): void {
    if (!doc || !doc.imageUrls || doc.imageUrls.length === 0) {
      alert('Aucun fichier disponible pour ce document.');
      return;
    }
    this.previewDocument.set(doc);
    this.showPreviewModal.set(true);
  }

  closePreviewModal(): void {
    this.showPreviewModal.set(false);
    this.previewDocument.set(null);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Cline x1="3" y1="15" x2="21" y2="15"/%3E%3Cline x1="3" y1="9" x2="21" y2="9"/%3E%3C/svg%3E';
    img.style.objectFit = 'contain';
    img.style.padding = '20px';
  }

  onIframeError(event: Event): void {
    const iframe = event.target as HTMLIFrameElement;
    iframe.style.display = 'none';
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Impossible d\'afficher ce document. Telechargez-le pour le consulter.';
    errorMsg.style.color = '#94a3b8';
    errorMsg.style.padding = '40px';
    iframe.parentElement?.appendChild(errorMsg);
  }

  viewDocument(documentId: string): void {
    if (!documentId) {
      alert('ID du document non trouve.');
      return;
    }
    const previewUrl = this.getDocumentPreviewUrlWithToken(documentId);
    window.open(previewUrl, '_blank');
  }

  downloadDocument(documentId: string, fileName?: string): void {
    if (!documentId) {
      alert('ID du document non trouve.');
      return;
    }
    const downloadUrl = this.getDocumentDownloadUrlWithToken(documentId);
    window.open(downloadUrl, '_blank');
  }

  downloadDocumentFromUrl(url: string, fileName?: string): void {
    if (!url) {
      alert('Aucune URL disponible.');
      return;
    }
    let fullUrl = url;
    if (url.startsWith('/uploads/')) {
      const baseUrl = this.apiUrl.replace('/api', '');
      fullUrl = `${baseUrl}${url}`;
    }
    const token = this.getToken();
    if (token) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
    window.open(fullUrl, '_blank');
  }

  refreshEmployeeDocuments(employeeId: string): void {
    if (!employeeId) return;
    this.documentService.getByEmployee(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (d: any[]) => {
          this.employeeDocuments.set(d);
        },
        error: () => this.employeeDocuments.set([])
      });
  }

  nextStep(): void {
    if (this.currentStep() === 1) {
      if (this.isStep1Valid()) this.currentStep.set(2);
      else this.markTouched(this.employeeForm, this.getStep1Fields());
      return;
    }
    if (this.currentStep() === 2) {
      if (this.contractForm.valid) this.currentStep.set(3);
      else this.contractForm.markAllAsTouched();
      return;
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) this.currentStep.set(this.currentStep() - 1);
  }

  goToStep(n: number): void {
    if (n < this.currentStep()) this.currentStep.set(n);
  }

  getStep1Fields(): string[] {
    const fields = ['nom', 'prenom', 'matriculeInterne', 'sexe', 'date_naissance', 'telephone', 'numeroContactUrgence', 'addresse', 'date_embauche', 'posteId', 'departementId', 'entrepriseId'];
    if (!this.isEditMode()) fields.push('email', 'password', 'roleId');
    return fields;
  }

  isStep1Valid(): boolean {
    return this.getStep1Fields().every(f => this.employeeForm.get(f)?.valid);
  }

  markTouched(group: FormGroup, fields: string[]): void {
    fields.forEach(f => group.get(f)?.markAsTouched());
  }

  openEmployeeModal(emp?: any): void {
    if (emp && !this.canUpdateEmployee()) {
      alert('Vous n\'avez pas la permission de modifier un employe.');
      return;
    }
    if (!emp && !this.canCreateEmployee()) {
      alert('Vous n\'avez pas la permission de creer un employe.');
      return;
    }

    this.currentStep.set(1);
    this.resetAllFiles();

    if (emp) {
      this.isEditMode.set(true);
      this.employeeForm.get('password')?.clearValidators();
      this.employeeForm.get('password')?.setValidators([]);
      this.employeeForm.get('email')?.clearValidators();
      this.employeeForm.get('roleId')?.clearValidators();

      const patchData = { 
        ...emp,
        nom: emp.nom || emp.name || '',
        prenom: emp.prenom || emp.prename || ''
      };
      
      if (patchData.poste && !patchData.posteId) {
        const foundPoste = this.postes().find((p: Poste) =>
          p.code === patchData.poste || p.libelle === patchData.poste
        );
        if (foundPoste) {
          patchData.posteId = foundPoste.id || foundPoste.code;
        } else {
          patchData.posteId = patchData.poste;
        }
      }
      this.employeeForm.patchValue(patchData);

      const deptId = emp.departementId || emp.departementid;
      if (deptId) {
        this.departementService.getById(deptId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (dept: Departement) => {
              const entrepriseId = dept.entrepriseId || (dept as any).entrepriseid;
              if (entrepriseId) {
                this.employeeForm.patchValue({ entrepriseId });
                this.departementService.getByEntreprise(entrepriseId)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (departements: Departement[]) => {
                      this.filteredDepartements.set(departements);
                      setTimeout(() => {
                        this.employeeForm.patchValue({ departementId: deptId });
                        this.filterPostesByDepartement(deptId);
                      }, 100);
                    },
                    error: (err) => {
                      console.error('Erreur chargement departements:', err);
                      this.filteredDepartements.set([]);
                    }
                  });
              } else {
                this.loadDepartements();
                this.filteredPostes.set(this.postes());
              }
            },
            error: (err) => {
              console.error('Erreur recuperation departement:', err);
              this.loadDepartements();
              this.filteredPostes.set(this.postes());
            }
          });
      } else {
        this.loadDepartements();
        this.filteredPostes.set(this.postes());
      }
    } else {
      this.isEditMode.set(false);
      this.employeeForm.reset({ sexe: 'M' });
      this.contractForm.reset({ typeContrat: 'CDI', statut: 'ACTIF' });
      this.employeeForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.employeeForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.employeeForm.get('roleId')?.setValidators([Validators.required]);
      this.filteredDepartements.set([]);
      this.filteredPostes.set([]);
      
      if (this.isDirection() && this.currentUserCompanyId()) {
        this.employeeForm.patchValue({ 
          entrepriseId: this.currentUserCompanyId() 
        });
        this.loadDepartementsByEntreprise(this.currentUserCompanyId());
      } else {
        this.filteredPostes.set(this.postes());
      }
    }

    Object.keys(this.employeeForm.controls).forEach(k =>
      this.employeeForm.get(k)?.updateValueAndValidity()
    );

    this.showEmployeeModal.set(true);
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal.set(false);
    this.currentStep.set(1);
    this.resetAllFiles();
  }

  resetAllFiles(): void {
    this.contratScanFiles = [];
    this.cniFiles = [];
    this.diplomeFiles = [];
    this.photoFiles = [];
    this.certificatFiles = [];
    this.docFiles = [];
    this.bulletinFiles = [];
  }

  onContratScanChange(event: any): void {
    this.contratScanFiles = Array.from(event.target.files || []);
  }

  onCategoryFileChange(event: any, category: string): void {
    const files = Array.from(event.target.files || []) as File[];
    switch(category) {
      case 'cni': this.cniFiles = files; break;
      case 'diplome': this.diplomeFiles = files; break;
      case 'photo': this.photoFiles = files; break;
      case 'certificat': this.certificatFiles = files; break;
    }
  }

  removeFile(category: string, index: number): void {
    switch(category) {
      case 'contratScan': this.contratScanFiles.splice(index, 1); break;
      case 'cni': this.cniFiles.splice(index, 1); break;
      case 'diplome': this.diplomeFiles.splice(index, 1); break;
      case 'photo': this.photoFiles.splice(index, 1); break;
      case 'certificat': this.certificatFiles.splice(index, 1); break;
    }
  }

  removeContratFile(index: number): void {
    if (index >= 0 && index < this.contratFiles.length) {
      this.contratFiles.splice(index, 1);
    }
  }

  openContratModal(): void {
    if (!this.canCreateAvenant()) {
      alert('Vous n\'avez pas la permission de creer un contrat.');
      return;
    }
    this.contratFormModal.reset({
      employeeId: '',
      typeContrat: 'CDI',
      dateDebut: '',
      dateFin: '',
      dateFinEssai: '',
      dureeEssaiMois: null,
      statut: 'ACTIF',
      salaireBrut: null,
      salaireNet: null,
      tauxHoraire: null,
      nombreHeuresSemaine: null,
      motifRecours: '',
      dureeMois: null,
      etablissement: '',
      tuteurNom: '',
      tuteurEmail: '',
      tuteurTelephone: '',
      objectifsStage: '',
      dureeSemaines: null,
      descriptionPrestation: '',
      modalitesPaiement: '',
      dureeMoisPrestation: null,
      estRenouvelable: false,
      renouvellementMax: null,
      observations: ''
    });
    this.contratFiles = [];
    this.selectedContractType.set('CDI');
    this.contractTypeConfig.set(this.getAdjustedConfig('CDI'));
    this.showContratModal.set(true);
  }

  closeContratModal(): void {
    this.showContratModal.set(false);
    this.contratFiles = [];
  }

  onContratFilesChange(event: any): void {
    this.contratFiles = Array.from(event.target.files || []);
  }

  submitContrat(): void {
    if (this.contratFormModal.invalid) {
      this.contratFormModal.markAllAsTouched();
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const formValues = this.contratFormModal.value;
    const formData = new FormData();

    const contratData = {
      employeeId: formValues.employeeId,
      typeContrat: formValues.typeContrat,
      dateDebut: formValues.dateDebut,
      dateFin: formValues.dateFin || null,
      dateFinEssai: formValues.dateFinEssai || null,
      dureeEssaiMois: formValues.dureeEssaiMois || null,
      statut: formValues.statut,
      salaireBrut: formValues.salaireBrut || null,
      salaireNet: formValues.salaireNet || null,
      tauxHoraire: formValues.tauxHoraire || null,
      nombreHeuresSemaine: formValues.nombreHeuresSemaine || null,
      motifRecours: formValues.motifRecours || null,
      dureeMois: formValues.dureeMois || null,
      etablissement: formValues.etablissement || null,
      tuteurNom: formValues.tuteurNom || null,
      tuteurEmail: formValues.tuteurEmail || null,
      tuteurTelephone: formValues.tuteurTelephone || null,
      objectifsStage: formValues.objectifsStage || null,
      dureeSemaines: formValues.dureeSemaines || null,
      descriptionPrestation: formValues.descriptionPrestation || null,
      modalitesPaiement: formValues.modalitesPaiement || null,
      dureeMoisPrestation: formValues.dureeMoisPrestation || null,
      estRenouvelable: formValues.estRenouvelable || false,
      renouvellementMax: formValues.renouvellementMax || null,
      observations: formValues.observations || null
    };

    formData.append('contrat', new Blob([JSON.stringify(contratData)], { type: 'application/json' }));

    this.contratFiles.forEach(file => {
      formData.append('files', file);
    });

    this.contratService.createContratWithImages(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeContratModal();
          this.loadContrats();
          alert('Contrat cree avec succes !');
        },
        error: (err) => {
          console.error('Erreur creation contrat:', err);
          alert('Erreur lors de la creation du contrat : ' + (err.error?.message || err.message));
        }
      });
  }

  openDatePicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.showPicker) {
      input.showPicker();
    }
  }

  private renameFilesWithPrefix(files: File[], prefix: string): File[] {
    return files.map((file) => {
      const lastDotIndex = file.name.lastIndexOf('.');
      const ext = lastDotIndex !== -1 ? file.name.substring(lastDotIndex) : '';
      const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
      const newName = `${prefix}_${baseName}${ext}`;
      return new File([file], newName, { type: file.type });
    });
  }

  submitEmployee(): void {
    if (this.isEditMode()) {
      this.updateEmployee();
      return;
    }

    if (!this.canCreateEmployee()) {
      alert('Vous n\'avez pas la permission de creer un employe.');
      return;
    }

    if (!this.isStep1Valid() || this.contractForm.invalid) {
      alert('Veuillez completer toutes les etapes.');
      return;
    }

    const rawEmp = this.employeeForm.value;
    const rawContrat = this.contractForm.value;
    const { entrepriseId, ...employeePayload } = rawEmp;

    const payload = {
      email: employeePayload.email,
      password: employeePayload.password,
      roleId: employeePayload.roleId,
      nom: employeePayload.nom,
      prenom: employeePayload.prenom,
      matricule_interne: employeePayload.matriculeInterne,
      matricule_CNPS: employeePayload.matricule_CNPS,
      sexe: employeePayload.sexe,
      date_naissance: employeePayload.date_naissance,
      telephone: employeePayload.telephone,
      numeroContactUrgence: employeePayload.numeroContactUrgence,
      addresse: employeePayload.addresse,
      date_embauche: employeePayload.date_embauche,
      posteId: employeePayload.posteId,
      departementId: employeePayload.departementId,
      entrepriseId: entrepriseId,
      typeContrat: rawContrat.typeContrat,
      dateDebutContrat: rawContrat.dateDebut,
      dateFinContrat: rawContrat.dateFin || null,
      salaireBrut: rawContrat.salaireBrut || null,
      salaireNet: rawContrat.salaireNet || null,
      tauxHoraire: rawContrat.tauxHoraire || null,
      nombreHeuresSemaine: rawContrat.nombreHeuresSemaine || null,
      dateFinEssai: rawContrat.dateFinEssai || null,
      dureeEssaiMois: rawContrat.dureeEssaiMois || null,
      motifRecours: rawContrat.motifRecours || null,
      dureeMois: rawContrat.dureeMois || null,
      etablissement: rawContrat.etablissement || null,
      tuteurNom: rawContrat.tuteurNom || null,
      tuteurEmail: rawContrat.tuteurEmail || null,
      tuteurTelephone: rawContrat.tuteurTelephone || null,
      objectifsStage: rawContrat.objectifsStage || null,
      dureeSemaines: rawContrat.dureeSemaines || null,
      descriptionPrestation: rawContrat.descriptionPrestation || null,
      modalitesPaiement: rawContrat.modalitesPaiement || null,
      dureeMoisPrestation: rawContrat.dureeMoisPrestation || null,
      estRenouvelable: rawContrat.estRenouvelable || false,
      renouvellementMax: rawContrat.renouvellementMax || null,
      observations: rawContrat.observations || null
    };

    const totalFiles = this.contratScanFiles.length + this.cniFiles.length +
                       this.diplomeFiles.length + this.photoFiles.length +
                       this.certificatFiles.length;
    if (totalFiles > 10) {
      alert('Vous ne pouvez envoyer que 10 fichiers maximum.');
      return;
    }

    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    const cniRenamed = this.renameFilesWithPrefix(this.cniFiles, 'CNI');
    const contratRenamed = this.renameFilesWithPrefix(this.contratScanFiles, 'CONTRAT');
    const diplomeRenamed = this.renameFilesWithPrefix(this.diplomeFiles, 'DIPLOME');
    const photoRenamed = this.renameFilesWithPrefix(this.photoFiles, 'PHOTO');
    const certificatRenamed = this.renameFilesWithPrefix(this.certificatFiles, 'CERTIFICAT');

    cniRenamed.forEach(file => formData.append('cniFiles', file));
    contratRenamed.forEach(file => formData.append('contratFiles', file));
    diplomeRenamed.forEach(file => formData.append('diplomeFiles', file));
    photoRenamed.forEach(file => formData.append('photoFiles', file));
    certificatRenamed.forEach(file => formData.append('certificatFiles', file));

    this.employeService.create(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEmployeesBasedOnRole();
          this.loadContrats();
          this.closeEmployeeModal();
          alert('Employe cree avec succes !');
        },
        error: (err: any) => {
          console.error('Erreur creation employe :', err);
          alert('Erreur lors de la creation : ' + (err.error?.message || err.message));
        }
      });
  }

  updateEmployee(): void {
    if (!this.canUpdateEmployee()) {
      alert('Vous n\'avez pas la permission de modifier un employe.');
      return;
    }

    const raw = this.employeeForm.value;
    const { entrepriseId, id, email, password, roleId, matriculeInterne, ...updateData } = raw;
    
    const payload = {
      nom: updateData.nom,
      prenom: updateData.prenom,
      matricule_CNPS: updateData.matricule_CNPS,
      sexe: updateData.sexe,
      date_naissance: updateData.date_naissance,
      telephone: updateData.telephone,
      numeroContactUrgence: updateData.numeroContactUrgence,
      addresse: updateData.addresse,
      date_embauche: updateData.date_embauche,
      posteId: updateData.posteId,
      departementId: updateData.departementId
    };
    
    this.employeService.update(raw.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEmployeesBasedOnRole();
          this.closeEmployeeModal();
          alert('Employe mis a jour avec succes !');
        },
        error: (err: any) => {
          console.error('Erreur mise a jour:', err);
          alert('Erreur lors de la mise a jour : ' + (err.error?.message || err.message));
        }
      });
  }

  suspendEmployee(id: string): void {
    if (!this.canSuspendEmployee()) {
      alert('Vous n\'avez pas la permission de suspendre un employe.');
      return;
    }
    if (!id) {
      alert('ID employe invalide.');
      return;
    }
    if (!confirm('Suspendre ce collaborateur ?')) return;
    this.employeService.suspendre(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadEmployeesBasedOnRole(),
        error: (err: any) => console.error('Erreur suspension:', err)
      });
  }

  reactivateEmployee(id: string): void {
    if (!this.canReactivateEmployee()) {
      alert('Vous n\'avez pas la permission de reactiver un employe.');
      return;
    }
    if (!id) {
      alert('ID employe invalide.');
      return;
    }
    this.employeService.reactiver(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadEmployeesBasedOnRole(),
        error: (err: any) => console.error('Erreur reactivation:', err)
      });
  }

  // ========================================================================
  // MÉTHODES MODALE DÉTAILS AVEC HISTORIQUE
  // ========================================================================

  viewEmployeeDetails(id: string): void {
    if (!this.canViewAllEmployees() && !this.canViewEmployee()) {
      alert('Vous n\'avez pas la permission de voir les details d\'un employe.');
      return;
    }
    if (!id) {
      alert('ID employe invalide.');
      return;
    }
    this.employeService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (emp: any) => {
          this.selectedEmployee.set(emp);
          this.activeDetailTab.set('info');
          this.employeeHistory.set(null);
          this.contratService.getByEmployee(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (c: any[]) => {
                this.activeEmployeeContracts.set(c);
              },
              error: () => this.activeEmployeeContracts.set([])
            });
          this.documentService.getByEmployee(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (d: any[]) => {
                this.employeeDocuments.set(d);
              },
              error: () => this.employeeDocuments.set([])
            });
          this.showDetailModal.set(true);
        },
        error: (err: any) => console.error('Erreur chargement details:', err)
      });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedEmployee.set(null);
    this.employeeHistory.set(null);
    this.activeDetailTab.set('info');
  }

  // ========================================================================
  // MÉTHODES POUR L'HISTORIQUE
  // ========================================================================

  loadEmployeeHistory(employeeId: string): void {
    if (!employeeId) return;
    this.isLoadingHistory.set(true);
    this.employeService.getHistory(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.employeeHistory.set(history);
          this.isLoadingHistory.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement historique:', err);
          this.employeeHistory.set(null);
          this.isLoadingHistory.set(false);
        }
      });
  }

  downloadHistory(employeeId: string, format: 'csv' | 'pdf'): void {
    if (!employeeId) return;
    this.employeService.downloadHistory(employeeId, format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const extension = format === 'csv' ? 'csv' : 'pdf';
          const fileName = `historique_employe_${employeeId}.${extension}`;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Erreur telechargement historique:', err);
          alert('Impossible de telecharger l\'historique.');
        }
      });
  }

  switchDetailTab(tab: 'info' | 'contracts' | 'documents' | 'history'): void {
    this.activeDetailTab.set(tab);
    if (tab === 'history' && this.selectedEmployee()) {
      if (!this.employeeHistory()) {
        this.loadEmployeeHistory(this.selectedEmployee().id);
      }
    }
  }

  getEventIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'HIRING': 'person_add',
      'CONTRACT_START': 'play_circle',
      'CONTRACT_END': 'stop_circle',
      'CONTRACT_TERMINATION': 'cancel',
      'LEAVE': 'beach_access',
      'ABSENCE': 'event_busy',
      'DOCUMENT': 'description',
      'PAYSLIP': 'receipt',
      'PERFORMANCE': 'trending_up',
      'LEAVE_BALANCE': 'balance',
      'STATUS_CHANGE': 'swap_horiz'
    };
    return iconMap[type] || 'event_note';
  }

  getEventColor(type: string): string {
    const colorMap: Record<string, string> = {
      'HIRING': 'success',
      'CONTRACT_START': 'primary',
      'CONTRACT_END': 'danger',
      'CONTRACT_TERMINATION': 'danger',
      'LEAVE': 'warning',
      'ABSENCE': 'warning',
      'DOCUMENT': 'info',
      'PAYSLIP': 'primary',
      'PERFORMANCE': 'success',
      'LEAVE_BALANCE': 'info',
      'STATUS_CHANGE': 'secondary'
    };
    return colorMap[type] || 'secondary';
  }

  /**
   * Transforme un objet details en tableau de paires clé-valeur pour l'affichage.
   * Si details est une chaîne, tente de la parser.
   */
  getDetailsArray(details: any): { key: string; value: any }[] {
    if (!details) {
      return [];
    }

    // Si c'est déjà un objet, on le convertit directement
    if (typeof details === 'object' && !Array.isArray(details)) {
      return Object.keys(details).map(key => ({
        key: key,
        value: details[key]
      }));
    }

    // Si c'est une chaîne, on tente de la parser
    if (typeof details === 'string') {
      try {
        // Essayer de parser du JSON
        const parsed = JSON.parse(details);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.keys(parsed).map(key => ({
            key: key,
            value: parsed[key]
          }));
        }
      } catch (e) {
        // Si ce n'est pas du JSON valide, on essaie d'extraire les paires clé=valeur
        const pairs = details.match(/(\w+)=([^,{}]+)/g);
        if (pairs) {
          return pairs.map(pair => {
            const [key, ...valueParts] = pair.split('=');
            return {
              key: key.trim(),
              value: valueParts.join('=').trim()
            };
          });
        }
      }
    }

    return [];
  }
    /**
   * Vérifie si un employé a un contrat actif qui expire dans les 14 jours.
   * @param employeeId L'ID de l'employé
   * @returns true si un contrat actif expire dans les 14 jours, false sinon
   */
  isEmployeeContractExpiring(employeeId: string): boolean {
    if (!employeeId) return false;
    const employeeContracts = this.contrats().filter(c => c.employeeId === employeeId || c.employee_id === employeeId);
    // Prendre le contrat actif le plus récent (ou n'importe quel contrat actif)
    const activeContract = employeeContracts.find(c => c.statut === 'ACTIF');
    if (!activeContract) return false;
    return this.isContractExpiring(activeContract);
  }

  // ========================================================================
  // AUTRES MÉTHODES
  // ========================================================================

  openAvenantModal(empId?: string): void {
    if (!this.canCreateAvenant()) {
      alert('Vous n\'avez pas la permission de creer un avenant.');
      return;
    }
    this.avenantForm.reset({ typeContrat: 'CDI', statut: 'ACTIF' });
    if (empId) this.avenantForm.patchValue({ employeId: empId });
    this.showAvenantModal.set(true);
  }

  closeAvenantModal(): void {
    this.showAvenantModal.set(false);
  }

  submitAvenant(): void {
    if (this.avenantForm.invalid) {
      this.avenantForm.markAllAsTouched();
      return;
    }
    this.contratService.createAvenant(this.avenantForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadContrats();
          this.closeAvenantModal();
          alert('Avenant cree avec succes !');
        },
        error: (err: any) => console.error('Erreur creation avenant:', err)
      });
  }

  openDocModal(empId: string): void {
    if (!this.canUploadDocuments()) {
      alert('Vous n\'avez pas la permission de televerser des documents.');
      return;
    }
    if (!empId) {
      alert('ID employe invalide.');
      return;
    }
    this.employeeForm.patchValue({ id: empId });
    this.docFiles = [];
    this.documentType = 'CNI';
    this.showDocModal.set(true);
  }

  closeDocModal(): void {
    this.showDocModal.set(false);
  }

  onDocFileChange(event: any): void {
    this.docFiles = Array.from(event.target.files || []);
  }

  onDocumentTypeChange(event: any): void {
    this.documentType = event.target.value;
  }

  submitEmployeeDocuments(): void {
    const empId = this.employeeForm.get('id')?.value;
    if (!empId || this.docFiles.length === 0) {
      alert('Veuillez selectionner au moins un fichier.');
      return;
    }

    const formData = new FormData();
    formData.append('typeDocument', this.documentType);
    formData.append('name', `Document ${this.documentType}`);
    this.docFiles.forEach(f => formData.append('files', f));

    this.documentService.uploadPiecesEmploye(empId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeDocModal();
          alert('Documents televerses avec succes !');
          if (this.showDetailModal()) {
            this.viewEmployeeDetails(empId);
          }
          this.loadEmployeesBasedOnRole();
        },
        error: (err: any) => {
          console.error('Erreur upload documents:', err);
          alert('Erreur lors du televersement des documents.');
        }
      });
  }

  openBulletinModal(empId: string): void {
    if (!this.canCreatePayroll()) {
      alert('Vous n\'avez pas la permission de creer un bulletin de paie.');
      return;
    }
    if (!empId) {
      alert('ID employe invalide.');
      return;
    }
    this.bulletinForm.reset({ employeId: empId, annee: new Date().getFullYear() });
    this.bulletinFiles = [];
    this.showBulletinModal.set(true);
  }

  closeBulletinModal(): void {
    this.showBulletinModal.set(false);
  }

  onBulletinFileChange(event: any): void {
    this.bulletinFiles = Array.from(event.target.files || []);
  }

  submitBulletin(): void {
    if (this.bulletinForm.invalid || this.bulletinFiles.length === 0) {
      alert('Veuillez remplir tous les champs et joindre le fichier.');
      return;
    }
    const empId = this.bulletinForm.get('employeId')?.value;
    const raw = this.bulletinForm.value;
    const formData = new FormData();
    formData.append('typeDocument', 'BULLETIN_PAIE');
    formData.append('name', `Bulletin ${raw.mois} ${raw.annee}`);
    formData.append('mois', raw.mois);
    formData.append('annee', raw.annee.toString());
    formData.append('montantNet', raw.montantNet.toString());
    this.bulletinFiles.forEach(f => formData.append('files', f));
    this.documentService.uploadPiecesEmploye(empId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeBulletinModal();
          alert('Bulletin enregistre avec succes !');
          if (this.showDetailModal()) this.viewEmployeeDetails(empId);
        },
        error: (err: any) => console.error('Erreur upload bulletin:', err)
      });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];
    const delta = 1;
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  canViewEmployeeDetails(employee: any): boolean {
    if (this.canViewAllEmployees()) return true;
    if (this.canViewEmployee()) return true;
    if (this.isDirection()) {
      const empDeptId = employee.departementId || employee.departementid;
      const companyDeptIds = this.getDepartementIdsByEntreprise(this.currentUserCompanyId());
      return companyDeptIds.includes(empDeptId);
    }
    return false;
  }

  getTotalVisibleEmployees(): number {
    return this.filteredEmployees().length;
  }

  getUserCompanyInfo(): string {
    if (this.currentUserCompanyName()) {
      return this.currentUserCompanyName();
    }
    return this.currentUserCompanyId() || 'Aucune entreprise associee';
  }
}