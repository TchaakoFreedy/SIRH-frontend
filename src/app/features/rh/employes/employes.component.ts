// src/app/features/rh/employes/employes.component.ts

import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
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
import { catchError, of, switchMap } from 'rxjs';

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
export class EmployesComponent implements OnInit {

  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'access_token';
  private permissionService = inject(PermissionService);
  private authService = inject(AuthService);

  // Formulaires
  employeeForm!: FormGroup;
  contractForm!: FormGroup;
  avenantForm!: FormGroup;
  bulletinForm!: FormGroup;
  contratFormModal!: FormGroup;

  // Données brutes (signaux)
  employees = signal<any[]>([]);
  entreprises = signal<Entreprise[]>([]);
  departements = signal<Departement[]>([]);
  roles = signal<any[]>([]);
  postes = signal<Poste[]>([]);
  contrats = signal<any[]>([]);

  // Départements et postes filtrés pour les selects du formulaire
  filteredDepartements = signal<Departement[]>([]);
  filteredPostes = signal<Poste[]>([]);

  // Signaux pour la recherche et le filtre
  searchTerm = signal<string>('');
  selectedDepartement = signal<string>('');

  // Signaux pour le filtrage par entreprise
  currentUserRole = signal<string>('');
  currentUserCompanyId = signal<string>('');
  currentUserCompanyName = signal<string>('');
  isRHOrAdmin = signal<boolean>(false);
  isDirection = signal<boolean>(false);
  companyFilter = signal<string>('');
  
  // Signal pour le chargement
  isLoading = signal<boolean>(false);
  loadingError = signal<string | null>(null);

  // Cache des départements par entreprise
  departementCache = new Map<string, string[]>();

  // Computed : employés enrichis avec les BONS noms de champs
  enrichedEmployees = computed(() => {
    const all = this.employees();
    const postes = this.postes();
    const roles = this.roles();
    const depts = this.departements();

    return all.map(emp => ({
      ...emp,
      // ✅ CORRECTION : Utiliser 'nom' et 'prenom' du backend
      nom: emp.nom || emp.name || '',
      prenom: emp.prenom || emp.prename || '',
      // Pour la recherche et l'affichage
      fullName: `${emp.prenom || emp.prename || ''} ${emp.nom || emp.name || ''}`.trim(),
      posteName: this.getPosteName(emp.posteId, postes),
      roleName: this.getRoleName(emp.roleId || emp.role, roles),
      departementName: this.getDepartementName(emp.departementId, depts),
      entrepriseId: this.getEntrepriseIdFromDepartement(emp.departementId, depts)
    }));
  });

  // Computed avec filtrage - CORRIGÉ
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
        // ✅ CORRECTION : Utiliser les bons noms de champs
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
    { num: 1, label: 'Identité & Compte', icon: 'person' },
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

    effect(() => {
      this.filteredEmployees();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    console.log('🚀 Initialisation du composant Employés');

    const user = this.authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', user);
    
    this.initializeUserRole(user);
    
    this.loadInitialData();
    this.loadEmployeesBasedOnRole();
  }

  initForms(): void {
    this.employeeForm = this.fb.group({
      id: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roleId: ['', Validators.required],
      // ✅ CORRECTION : Utiliser 'nom' et 'prenom' comme dans le backend
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      matriculeInterne: ['', Validators.required],
      matricule_CNPS: [''],
      sexe: ['M', Validators.required],
      date_naissance: ['', Validators.required],
      telephone: ['', Validators.required],
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
      statut: ['ACTIF', Validators.required]
    });

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
      statut: ['ACTIF', Validators.required]
    });
  }

  private initializeUserRole(user: any): void {
    const role = user?.role || '';
    const roles = user?.roles || [];
    
    this.currentUserRole.set(role);

    const isRH = role === 'RH' ||
                 role === 'SUPER_ADMIN' ||
                 role === 'TOP_MANAGER' ||
                 roles.includes('RH') ||
                 roles.includes('SUPER_ADMIN') ||
                 roles.includes('TOP_MANAGER') ||
                 user?.permissions?.includes('*') === true;

    const isDirectionRole = role === 'DIRECTION' || 
                           roles.includes('DIRECTION') ||
                           role === 'DIRECTION_GENERALE' ||
                           roles.includes('DIRECTION_GENERALE') ||
                           role === 'DIRECTOR' ||
                           roles.includes('DIRECTOR');

    this.isRHOrAdmin.set(isRH);
    this.isDirection.set(isDirectionRole);

    const userCompanyId = user?.entrepriseId || 
                         user?.companyId || 
                         user?.entreprise?.id || 
                         user?.entreprise?.id;

    if (userCompanyId) {
      this.currentUserCompanyId.set(userCompanyId);
      this.companyFilter.set(userCompanyId);
    }

    if (isRH) {
      this.setFullPermissions(true);
    } else {
      this.loadPermissions();
    }
  }

  private loadInitialData(): void {
    this.loadEntreprises();
    this.loadPostes();
    this.loadDepartements();
    this.loadContrats();
    this.loadRolesWithFallback();
  }

  private loadRolesWithFallback(): void {
    this.roleService.getAll().pipe(
      catchError((error) => {
        console.warn('⚠️ Erreur chargement des rôles, utilisation des rôles par défaut');
        return of([
          { id: '1', name: 'RH / Admin' },
          { id: '2', name: 'Collaborateur' },
          { id: '3', name: 'Manager' },
          { id: '4', name: 'Direction' },
          { id: '5', name: 'Super Admin' }
        ]);
      })
    ).subscribe({
      next: (data: any[]) => {
        console.log('✅ Rôles chargés:', data.length);
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

    if (this.isRHOrAdmin()) {
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
        this.entrepriseService.getMyEntreprise(userId).pipe(
          catchError(error => {
            if (userEmail) {
              return this.findCompanyByUserEmail(userEmail);
            }
            return of(null);
          })
        ).subscribe({
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
        this.findCompanyByUserEmail(userEmail).subscribe({
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
    this.departementService.getByEntreprise(companyId).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (departements: Departement[]) => {
        if (departements.length === 0) {
          this.employees.set([]);
          this.isLoading.set(false);
          return;
        }

        const deptIds = departements.map(d => d.id || (d as any).id).filter(id => id);
        this.departementCache.set(companyId, deptIds);

        this.employeService.getAll().pipe(
          catchError(() => of([]))
        ).subscribe({
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
            
            this.employees.set(mapped);
            this.isLoading.set(false);
          },
          error: () => this.loadAllEmployees()
        });
      },
      error: () => this.loadAllEmployees()
    });
  }

  private loadAllEmployees(): void {
    this.employeService.getAll().subscribe({
      next: (data: any[]) => {
        const mapped = data.map(emp => ({
          ...emp,
          id: emp.id || emp.id,
          departementId: emp.departementId || emp.departementid
        }));
        this.employees.set(mapped);
        this.isLoading.set(false);
        this.loadingError.set(null);
      },
      error: (err: any) => {
        this.employees.set([]);
        this.loadingError.set('Erreur lors du chargement des employés');
        this.isLoading.set(false);
      }
    });
  }

  private setFullPermissions(hasAccess: boolean): void {
    this.canViewAllEmployees.set(hasAccess);
    this.canViewEmployee.set(hasAccess);
    this.canCreateEmployee.set(hasAccess);
    this.canUpdateEmployee.set(hasAccess);
    this.canDeleteEmployee.set(hasAccess);
    this.canSuspendEmployee.set(hasAccess);
    this.canReactivateEmployee.set(hasAccess);
    this.canUploadDocuments.set(hasAccess);
    this.canViewDocuments.set(hasAccess);
    this.canCreatePayroll.set(hasAccess);
    this.canCreateAvenant.set(hasAccess);
  }

  private loadPermissions(): void {
    this.canViewAllEmployees.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_VIEW_ALL'));
    this.canViewEmployee.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_VIEW'));
    this.canCreateEmployee.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_CREATE'));
    this.canUpdateEmployee.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_UPDATE'));
    this.canDeleteEmployee.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_DELETE'));
    this.canSuspendEmployee.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_SUSPEND'));
    this.canReactivateEmployee.set(!!this.permissionService.hasPermissionSync('EMPLOYEE_REACTIVATE'));
    this.canUploadDocuments.set(!!this.permissionService.hasPermissionSync('DOC_UPLOAD'));
    this.canViewDocuments.set(!!this.permissionService.hasPermissionSync('DOC_VIEW_ALL'));
    this.canCreatePayroll.set(!!this.permissionService.hasPermissionSync('PAYSLIP_CREATE'));
    this.canCreateAvenant.set(!!this.permissionService.hasPermissionSync('CONTRACT_CREATE'));
  }

  loadEntreprises(): void {
    this.entrepriseService.getAll().subscribe({
      next: (data: Entreprise[]) => {
        this.entreprises.set(data);
      },
      error: () => this.entreprises.set([])
    });
  }

  loadDepartements(): void {
    this.departementService.getAll().subscribe({
      next: (data: Departement[]) => {
        this.departements.set(data || []);
        this.departementCache.clear();
      },
      error: () => this.departements.set([])
    });
  }

  loadContrats(): void {
    this.contratService.getAll().subscribe({
      next: (data: any[]) => this.contrats.set(data || []),
      error: () => this.contrats.set([])
    });
  }

  loadPostes(): void {
    this.postesService.getAll().subscribe({
      next: (data: Poste[]) => {
        this.postes.set(data);
      },
      error: () => this.postes.set([])
    });
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
    // Les filtres sont réactifs
  }

  onEntrepriseChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const entrepriseId = select.value;
    this.employeeForm.patchValue({ entrepriseId });
    this.loadDepartementsByEntreprise(entrepriseId);
  }

  onDepartementChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const departementId = select.value;
    this.employeeForm.patchValue({ departementId });
    this.loadPostesByDepartement(departementId);
  }

  loadDepartementsByEntreprise(entrepriseId: string): void {
    if (!entrepriseId) {
      this.filteredDepartements.set([]);
      return;
    }
    this.departementService.getByEntreprise(entrepriseId).subscribe({
      next: (data: Departement[]) => {
        this.filteredDepartements.set(data);
        this.employeeForm.patchValue({ departementId: '' });
        this.filteredPostes.set([]);
        this.employeeForm.patchValue({ posteId: '' });
      },
      error: () => this.filteredDepartements.set([])
    });
  }

  loadPostesByDepartement(departementId: string): void {
    if (!departementId) {
      this.filteredPostes.set([]);
      return;
    }
    this.postesService.getByDepartement(departementId).subscribe({
      next: (data: Poste[]) => {
        this.filteredPostes.set(data);
        this.employeeForm.patchValue({ posteId: '' });
      },
      error: () => this.filteredPostes.set([])
    });
  }

  getPosteName(posteId: string, postesList: Poste[] = this.postes()): string {
    if (!posteId) return 'Non défini';
    const poste = postesList.find((p: Poste) => p.id === posteId || p.code === posteId);
    return poste ? (poste.libelle || poste.code || 'Poste non trouvé') : 'Poste non trouvé';
  }

  getRoleName(roleId: string, rolesList: any[] = this.roles()): string {
    if (!roleId) return 'Non défini';
    const role = rolesList.find(r => r.id === roleId || r.id === roleId);
    return role ? (role.name || role.nom || 'Rôle') : 'Non défini';
  }

  getDepartementName(deptId: string, deptsList: Departement[] = this.departements()): string {
    if (!deptId) return 'Non Assigné';
    const dept = deptsList.find(d => d.id === deptId);
    return dept ? (dept.name || 'Non Assigné') : 'Non Assigné';
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
    errorMsg.textContent = 'Impossible d\'afficher ce document. Téléchargez-le pour le consulter.';
    errorMsg.style.color = '#94a3b8';
    errorMsg.style.padding = '40px';
    iframe.parentElement?.appendChild(errorMsg);
  }

  viewDocument(documentId: string): void {
    if (!documentId) {
      alert('ID du document non trouvé.');
      return;
    }
    const previewUrl = this.getDocumentPreviewUrlWithToken(documentId);
    window.open(previewUrl, '_blank');
  }

  downloadDocument(documentId: string, fileName?: string): void {
    if (!documentId) {
      alert('ID du document non trouvé.');
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
    this.documentService.getByEmployee(employeeId).subscribe({
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
    // ✅ CORRECTION : Utiliser 'nom' et 'prenom'
    const fields = ['nom', 'prenom', 'matriculeInterne', 'sexe', 'date_naissance', 'telephone', 'addresse', 'date_embauche', 'posteId', 'departementId', 'entrepriseId'];
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
      alert('Vous n\'avez pas la permission de modifier un employé.');
      return;
    }
    if (!emp && !this.canCreateEmployee()) {
      alert('Vous n\'avez pas la permission de créer un employé.');
      return;
    }

    this.currentStep.set(1);
    this.resetAllFiles();
    this.filteredDepartements.set([]);
    this.filteredPostes.set([]);

    if (emp) {
      this.isEditMode.set(true);
      this.employeeForm.get('password')?.clearValidators();
      this.employeeForm.get('password')?.setValidators([]);
      this.employeeForm.get('email')?.clearValidators();
      this.employeeForm.get('roleId')?.clearValidators();

      // ✅ CORRECTION : Utiliser 'nom' et 'prenom'
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
        this.departementService.getById(deptId).subscribe({
          next: (dept: Departement) => {
            const entrepriseId = dept.entrepriseId;
            if (entrepriseId) {
              this.employeeForm.patchValue({ entrepriseId });
              this.loadDepartementsByEntreprise(entrepriseId);
              setTimeout(() => {
                this.employeeForm.patchValue({ departementId: deptId });
                this.loadPostesByDepartement(deptId);
              }, 300);
            }
          },
          error: () => {}
        });
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

  openContratModal(): void {
    this.contratFormModal.reset({
      employeeId: '',
      typeContrat: 'CDI',
      dateDebut: '',
      dateFin: '',
      statut: 'ACTIF'
    });
    this.contratFiles = [];
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
      statut: formValues.statut
    };

    formData.append('contrat', new Blob([JSON.stringify(contratData)], { type: 'application/json' }));

    this.contratFiles.forEach(file => {
      formData.append('files', file);
    });

    this.contratService.createContratWithImages(formData).subscribe({
      next: () => {
        this.closeContratModal();
        this.loadContrats();
        alert('✅ Contrat créé avec succès !');
      },
      error: (err) => {
        console.error('Erreur création contrat:', err);
        alert('❌ Erreur lors de la création du contrat : ' + (err.error?.message || err.message));
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
      alert('Vous n\'avez pas la permission de créer un employé.');
      return;
    }

    if (!this.isStep1Valid() || this.contractForm.invalid) {
      alert('Veuillez compléter toutes les étapes.');
      return;
    }

    const rawEmp = this.employeeForm.value;
    const rawContrat = this.contractForm.value;
    const { entrepriseId, ...employeePayload } = rawEmp;

    // ✅ CORRECTION : Utiliser 'nom' et 'prenom'
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
      addresse: employeePayload.addresse,
      date_embauche: employeePayload.date_embauche,
      posteId: employeePayload.posteId,
      departementId: employeePayload.departementId,
      entrepriseId: entrepriseId,
      typeContrat: rawContrat.typeContrat,
      dateDebutContrat: rawContrat.dateDebut,
      dateFinContrat: rawContrat.dateFin,
      cniUrls: [],
      certificatUrls: [],
      photoUrls: []
    };

    console.log('📤 Payload envoyé:', JSON.stringify(payload, null, 2));

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

    this.employeService.create(formData).subscribe({
      next: () => {
        this.loadEmployeesBasedOnRole();
        this.loadContrats();
        this.closeEmployeeModal();
        alert('✅ Employé créé avec succès !');
      },
      error: (err: any) => {
        console.error('❌ Erreur création employé :', err);
        if (err.error && typeof err.error === 'object') {
          console.error('📋 Détails de l\'erreur:', JSON.stringify(err.error, null, 2));
        }
        alert('❌ Erreur lors de la création : ' + (err.error?.message || err.message));
      }
    });
  }

  updateEmployee(): void {
    if (!this.canUpdateEmployee()) {
      alert('Vous n\'avez pas la permission de modifier un employé.');
      return;
    }

    const raw = this.employeeForm.value;
    const { entrepriseId, id, email, password, roleId, matriculeInterne, ...updateData } = raw;
    
    // ✅ CORRECTION : Utiliser 'nom' et 'prenom'
    const payload = {
      nom: updateData.nom,
      prenom: updateData.prenom,
      matricule_CNPS: updateData.matricule_CNPS,
      sexe: updateData.sexe,
      date_naissance: updateData.date_naissance,
      telephone: updateData.telephone,
      addresse: updateData.addresse,
      date_embauche: updateData.date_embauche,
      posteId: updateData.posteId,
      departementId: updateData.departementId
    };
    
    console.log('📤 Update payload:', JSON.stringify(payload, null, 2));
    
    this.employeService.update(raw.id, payload).subscribe({
      next: () => {
        this.loadEmployeesBasedOnRole();
        this.closeEmployeeModal();
        alert('✅ Employé mis à jour avec succès !');
      },
      error: (err: any) => {
        console.error('❌ Erreur mise à jour:', err);
        alert('❌ Erreur lors de la mise à jour : ' + (err.error?.message || err.message));
      }
    });
  }

  suspendEmployee(id: string): void {
    if (!this.canSuspendEmployee()) {
      alert('Vous n\'avez pas la permission de suspendre un employé.');
      return;
    }
    if (!id) {
      alert('ID employé invalide.');
      return;
    }
    if (!confirm('Suspendre ce collaborateur ?')) return;
    this.employeService.suspendre(id).subscribe({
      next: () => this.loadEmployeesBasedOnRole(),
      error: (err: any) => console.error('Erreur suspension:', err)
    });
  }

  reactivateEmployee(id: string): void {
    if (!this.canReactivateEmployee()) {
      alert('Vous n\'avez pas la permission de réactiver un employé.');
      return;
    }
    if (!id) {
      alert('ID employé invalide.');
      return;
    }
    this.employeService.reactiver(id).subscribe({
      next: () => this.loadEmployeesBasedOnRole(),
      error: (err: any) => console.error('Erreur réactivation:', err)
    });
  }

  viewEmployeeDetails(id: string): void {
    if (!this.canViewAllEmployees() && !this.canViewEmployee()) {
      alert('Vous n\'avez pas la permission de voir les détails d\'un employé.');
      return;
    }
    if (!id) {
      alert('ID employé invalide.');
      return;
    }
    this.employeService.getById(id).subscribe({
      next: (emp: any) => {
        this.selectedEmployee.set(emp);
        this.contratService.getByEmployee(id).subscribe({
          next: (c: any[]) => this.activeEmployeeContracts.set(c),
          error: () => this.activeEmployeeContracts.set([])
        });
        this.documentService.getByEmployee(id).subscribe({
          next: (d: any[]) => {
            this.employeeDocuments.set(d);
          },
          error: () => this.employeeDocuments.set([])
        });
        this.showDetailModal.set(true);
      },
      error: (err: any) => console.error('Erreur chargement détails:', err)
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedEmployee.set(null);
  }

  openAvenantModal(empId?: string): void {
    if (!this.canCreateAvenant()) {
      alert('Vous n\'avez pas la permission de créer un avenant.');
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
    this.contratService.create(this.avenantForm.value).subscribe({
      next: () => {
        this.loadContrats();
        this.closeAvenantModal();
        alert('✅ Avenant créé avec succès !');
      },
      error: (err: any) => console.error('Erreur création avenant:', err)
    });
  }

  openDocModal(empId: string): void {
    if (!this.canUploadDocuments()) {
      alert('Vous n\'avez pas la permission de téléverser des documents.');
      return;
    }
    if (!empId) {
      alert('ID employé invalide.');
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
      alert('Veuillez sélectionner au moins un fichier.');
      return;
    }

    const formData = new FormData();
    formData.append('typeDocument', this.documentType);
    formData.append('name', `Document ${this.documentType}`);
    this.docFiles.forEach(f => formData.append('files', f));

    this.documentService.uploadPiecesEmploye(empId, formData).subscribe({
      next: () => {
        this.closeDocModal();
        alert('✅ Documents téléversés avec succès !');
        if (this.showDetailModal()) {
          this.viewEmployeeDetails(empId);
        }
        this.loadEmployeesBasedOnRole();
      },
      error: (err: any) => {
        console.error('Erreur upload documents:', err);
        alert('❌ Erreur lors du téléversement des documents.');
      }
    });
  }

  openBulletinModal(empId: string): void {
    if (!this.canCreatePayroll()) {
      alert('Vous n\'avez pas la permission de créer un bulletin de paie.');
      return;
    }
    if (!empId) {
      alert('ID employé invalide.');
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
    this.documentService.uploadPiecesEmploye(empId, formData).subscribe({
      next: () => {
        this.closeBulletinModal();
        alert('✅ Bulletin enregistré avec succès !');
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
    if (this.isRHOrAdmin()) return true;
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
    return this.currentUserCompanyId() || 'Aucune entreprise associée';
  }
}