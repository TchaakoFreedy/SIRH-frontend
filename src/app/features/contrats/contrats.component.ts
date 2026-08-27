// src/app/features/rh/contrats/contrats.component.ts
import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ContratService } from '../../core/services/contrat.service';
import { EmployeService } from '../../core/services/employe.service';
import { ContractAlertConfigService } from '../../core/services/contract-alert-config.service';
import {
  Contrat,
  TypeContrat,
  StatutContrat,
  contractHasEndDate,
  contractRequiresTrialPeriod,
  getTypeContratLibelle,
  getStatutLibelle,
  CONTRACT_TYPE_CONFIG,
  ContractAlertConfig,
  UpdateContractAlertConfigRequest
} from '../../core/models/contrat.model';
import { Employee } from '../../core/models/employee.model';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-contrats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatTooltipModule
  ],
  templateUrl: './contrats.component.html',
  styleUrls: ['./contrats.component.scss']
})
export class ContratsComponent implements OnInit, OnDestroy {
  public contratService = inject(ContratService);
  private employeeService = inject(EmployeService);
  private permissionService = inject(PermissionService);
  private fb = inject(FormBuilder);
  private alertConfigService = inject(ContractAlertConfigService);

  private destroy$ = new Subject<void>();

  isLoading = signal(false);
  showSuccessToast = signal(false);
  successMessage = signal('');
  isErrorToast = signal(false);
  editMode = signal(false);

  contrats = signal<Contrat[]>([]);
  employees = signal<Employee[]>([]);
  filteredContrats = signal<any[]>([]);

  form: FormGroup;
  showModal = signal(false);
  selectedFiles: File[] = [];
  selectedContratId: string | null = null;

  today: string = new Date().toISOString().split('T')[0];

  showDetailModal = signal(false);
  selectedContratForDetail = signal<any | null>(null);

  // Propriétés pour la configuration des alertes (globale)
  showAlertConfigPanel = signal(false);
  alertConfig: ContractAlertConfig | null = null;
  alertConfigForm: FormGroup;
  isAlertConfigLoading = signal(false);

  // Computed enrichi avec tri décroissant par createdAt
  enrichedContrats = computed(() => {
    return this.contrats()
      .map(contrat => {
        const employeeName = this.getEmployeeName(contrat);
        const employeeInitials = this.getEmployeeInitials(contrat);
        return {
          ...contrat,
          employeeName,
          employeeInitials
        };
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  });

  stats = computed(() => {
    const all = this.enrichedContrats();
    const actifs = all.filter(c => c.statut === 'ACTIF').length;
    const expires = all.filter(c => c.statut === 'EXPIRE').length;
    const archives = all.filter(c => c.statut === 'ARCHIVE').length;
    const resilies = all.filter(c => c.statut === 'RESILIE').length;
    const expirant = all.filter(c => c.statut === 'ACTIF' && c.dateFin && new Date(c.dateFin) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)).length;
    return { total: all.length, actifs, expires, archives, resilies, expirant };
  });

  searchTerm = '';
  selectedStatut: string = '';
  selectedType: string = '';
  statutOptions: StatutContrat[] = ['ACTIF', 'EN_ATTENTE', 'SUSPENDU', 'EXPIRE', 'RESILIE', 'ARCHIVE', 'EN_RENOUVELLEMENT', 'EN_ESSAI', 'A_VENIR'];
  typeOptions: TypeContrat[] = ['CDI', 'CDD', 'ESSAI', 'STAGE_ACADEMIQUE', 'STAGE_PROFESSIONNEL', 'FREELANCE'];

  currentPage = 1;
  pageSize = 10;

  canCreate = computed(() => this.permissionService.hasPermissionSync('CONTRACT_CREATE'));
  canUpdate = computed(() => this.permissionService.hasPermissionSync('CONTRACT_UPDATE'));
  canDelete = computed(() => this.permissionService.hasPermissionSync('CONTRACT_DELETE'));
  canView = computed(() => this.permissionService.hasPermissionSync('CONTRACT_VIEW'));

  contractHasEndDate = contractHasEndDate;
  contractRequiresTrialPeriod = contractRequiresTrialPeriod;
  getTypeLibelle = getTypeContratLibelle;
  getStatutLibelle = getStatutLibelle;

  Math = Math;

  private dateFinValidator(control: AbstractControl): ValidationErrors | null {
    const statut = this.form?.get('statut')?.value;
    const dateFin = control.value;
    if (statut === 'ACTIF' && dateFin) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(dateFin);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        return { dateFinPassed: true };
      }
    }
    return null;
  }

  isActive(statut: string | StatutContrat): boolean {
    return statut === 'ACTIF';
  }

  isExpired(statut: string | StatutContrat): boolean {
    return statut === 'EXPIRE';
  }

  isArchived(statut: string | StatutContrat): boolean {
    return statut === 'ARCHIVE';
  }

  isResilie(statut: string | StatutContrat): boolean {
    return statut === 'RESILIE';
  }

  isEnAttente(statut: string | StatutContrat): boolean {
    return statut === 'EN_ATTENTE';
  }

  isRenewable(contrat: any): boolean {
    if (!contrat) return false;
    const renewableStatus = contrat.statut === 'ACTIF' || contrat.statut === 'EN_ESSAI';
    const excludedStatus = contrat.statut === 'RESILIE' || contrat.statut === 'ARCHIVE' || contrat.statut === 'EXPIRE';
    return renewableStatus && !excludedStatus;
  }

  getEmployeeName(contrat: any): string {
    if (!contrat) return 'Inconnu';

    const prenom = contrat.employeePrenom || '';
    const nom = contrat.employeeNom || '';
    if (prenom || nom) {
      return `${prenom} ${nom}`.trim() || 'Inconnu';
    }

    const employeeId = this.extractEmployeeId(contrat);
    if (employeeId) {
      const emp = this.employees().find(e => e.id === employeeId);
      if (emp) {
        const p = emp.prenom || '';
        const n = emp.nom || '';
        return `${p} ${n}`.trim() || 'Inconnu';
      }
    }

    return 'Inconnu';
  }

  getEmployeeInitials(contrat: any): string {
    const fullName = this.getEmployeeName(contrat);
    if (fullName === 'Inconnu') return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  private extractEmployeeId(contrat: any): string | null {
    if (!contrat) return null;
    if (contrat.employeeId) return contrat.employeeId;
    if (contrat.employeId) return contrat.employeId;
    if (contrat.employee_id) return contrat.employee_id;
    const emp = contrat.employee;
    if (emp) {
      if (emp.id) return emp.id;
      if (emp.$id) return emp.$id;
    }
    return null;
  }

  isContractExpiring(contrat: any): boolean {
    if (!contrat || !contrat.dateFin) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(contrat.dateFin);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 14) {
      return false;
    }
    return true;
  }

  constructor() {
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      typeContrat: ['', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: [null, [this.dateFinValidator.bind(this)]],
      dateFinEssai: [null],
      dureeEssaiMois: [null],
      statut: ['ACTIF'],
      salaireBrut: [null],
      salaireNet: [null],
      tauxHoraire: [null],
      nombreHeuresSemaine: [null],
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

    // Formulaire de configuration d'alerte globale
    this.alertConfigForm = this.fb.group({
      enabled: [true],
      daysBefore: [14, [Validators.required, Validators.min(1), Validators.max(365)]],
      emailRecipients: [''],
      emailCc: [''],
      emailSubject: ['Alerte expiration de contrat'],
      emailBodyTemplate: ['Le contrat de l\'employé {employeeName} (type {typeContrat}) arrive à expiration le {endDate}. Veuillez prendre les mesures nécessaires.']
    });

    this.form.get('typeContrat')?.valueChanges.subscribe(type => {
      this.updateFormFields(type);
    });
  }

  private updateFormFields(type: TypeContrat): void {
    const config = CONTRACT_TYPE_CONFIG[type];
    if (!config) return;
    const controls = this.form.controls;

    if (config.hasEndDate) {
      controls['dateFin'].setValidators([Validators.required, this.dateFinValidator.bind(this)]);
    } else {
      controls['dateFin'].setValidators([this.dateFinValidator.bind(this)]);
      controls['dateFin'].setValue(null);
    }

    if (config.requiresTrialPeriod) {
      controls['dureeEssaiMois'].setValidators([Validators.min(1)]);
    } else {
      controls['dureeEssaiMois'].clearValidators();
      controls['dureeEssaiMois'].setValue(null);
    }
    if (config.requiresMotifRecours) {
      controls['motifRecours'].setValidators([Validators.required]);
    } else {
      controls['motifRecours'].clearValidators();
      controls['motifRecours'].setValue('');
    }
    if (config.requiresEtablissement) {
      controls['etablissement'].setValidators([Validators.required]);
    } else {
      controls['etablissement'].clearValidators();
      controls['etablissement'].setValue('');
    }
    if (config.requiresTuteur) {
      controls['tuteurNom'].setValidators([Validators.required]);
    } else {
      controls['tuteurNom'].clearValidators();
      controls['tuteurNom'].setValue('');
    }
    if (config.requiresPrestationDescription) {
      controls['descriptionPrestation'].setValidators([Validators.required]);
    } else {
      controls['descriptionPrestation'].clearValidators();
      controls['descriptionPrestation'].setValue('');
    }

    Object.values(controls).forEach(c => c.updateValueAndValidity({ emitEvent: false }));
  }

  ngOnInit(): void {
    this.loadData();
    this.loadAlertConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Méthodes de chargement et de sauvegarde de la config (globale)
  private loadAlertConfig(): void {
    this.isAlertConfigLoading.set(true);
    this.alertConfigService.getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.alertConfig = config;
          this.alertConfigForm.patchValue({
            enabled: config.enabled,
            daysBefore: config.daysBefore,
            emailRecipients: config.emailRecipients ? config.emailRecipients.join(', ') : '',
            emailCc: config.emailCc ? config.emailCc.join(', ') : '',
            emailSubject: config.emailSubject,
            emailBodyTemplate: config.emailBodyTemplate
          });
          this.isAlertConfigLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement config alerte:', err);
          this.isAlertConfigLoading.set(false);
          this.showToast('Erreur lors du chargement de la configuration des alertes', true);
        }
      });
  }

  saveAlertConfig(): void {
    if (this.alertConfigForm.invalid) {
      this.showToast('Veuillez corriger les erreurs du formulaire', true);
      return;
    }

    const values = this.alertConfigForm.value;
    const request: UpdateContractAlertConfigRequest = {
      enabled: values.enabled,
      daysBefore: values.daysBefore,
      emailRecipients: values.emailRecipients ? values.emailRecipients.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
      emailCc: values.emailCc ? values.emailCc.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
      emailSubject: values.emailSubject,
      emailBodyTemplate: values.emailBodyTemplate
    };

    this.isAlertConfigLoading.set(true);
    this.alertConfigService.updateConfig(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.alertConfig = updated;
          this.isAlertConfigLoading.set(false);
          this.showToast('Configuration des alertes mise à jour avec succès');
          this.showAlertConfigPanel.set(false);
        },
        error: (err) => {
          console.error('Erreur mise à jour config:', err);
          this.isAlertConfigLoading.set(false);
          this.showToast('Erreur lors de la mise à jour de la configuration', true);
        }
      });
  }

  toggleAlertConfigPanel(): void {
    if (!this.showAlertConfigPanel()) {
      this.loadAlertConfig();
    }
    this.showAlertConfigPanel.set(!this.showAlertConfigPanel());
  }

  // Fin des méthodes de configuration

  private loadData(): void {
    this.isLoading.set(true);

    this.contratService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        console.log('=== CONTRATS REÇUS ===');
        console.log('Nombre de contrats:', data.length);
        if (data.length > 0) {
          console.log('Premier contrat (structure):', data[0]);
          console.log('Clés du premier contrat:', Object.keys(data[0]));
          console.log('Contrat complet:', JSON.stringify(data[0], null, 2));
        }
        this.contrats.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement contrats:', err);
        this.isLoading.set(false);
        this.showToast('Erreur lors du chargement des contrats', true);
      }
    });

    this.employeeService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Employee[]) => {
        console.log('=== EMPLOYÉS REÇUS ===');
        console.log('Nombre d\'employés:', data.length);
        if (data.length > 0) {
          console.log('Premier employé (structure):', data[0]);
        }
        this.employees.set(data);
      },
      error: (err) => {
        console.error('Erreur chargement employés:', err);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.enrichedContrats();
    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(c =>
        c.employeeName.toLowerCase().includes(term) ||
        (c.typeContrat?.toLowerCase().includes(term) || false) ||
        (c.id?.toLowerCase().includes(term) || false)
      );
    }
    if (this.selectedStatut) {
      filtered = filtered.filter(c => c.statut === this.selectedStatut);
    }
    if (this.selectedType) {
      filtered = filtered.filter(c => c.typeContrat === this.selectedType);
    }
    this.filteredContrats.set(filtered);
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatut = '';
    this.selectedType = '';
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  get paginatedContrats(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredContrats().slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredContrats().length / this.pageSize) || 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    if (total <= 5) {
      for (let i = 2; i < total; i++) pages.push(i);
      return pages;
    }
    const current = this.currentPage;
    if (current <= 3) {
      for (let i = 2; i <= 4; i++) pages.push(i);
    } else if (current >= total - 2) {
      for (let i = total - 3; i < total; i++) pages.push(i);
    } else {
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    }
    return pages;
  }

  openModal(contrat?: any): void {
    this.editMode.set(!!contrat);
    this.selectedContratId = contrat?.id || null;
    this.selectedFiles = [];
    if (contrat) {
      const employeeId = this.extractEmployeeId(contrat) || '';
      this.form.patchValue({
        employeeId: employeeId,
        typeContrat: contrat.typeContrat,
        dateDebut: contrat.dateDebut?.split('T')[0],
        dateFin: contrat.dateFin?.split('T')[0] || null,
        dateFinEssai: contrat.dateFinEssai?.split('T')[0] || null,
        dureeEssaiMois: contrat.dureeEssaiMois,
        statut: contrat.statut,
        salaireBrut: contrat.salaireBrut,
        salaireNet: contrat.salaireNet,
        tauxHoraire: contrat.tauxHoraire,
        nombreHeuresSemaine: contrat.nombreHeuresSemaine,
        motifRecours: contrat.motifRecours || '',
        dureeMois: contrat.dureeMois || null,
        etablissement: contrat.etablissement || '',
        tuteurNom: contrat.tuteurNom || '',
        tuteurEmail: contrat.tuteurEmail || '',
        tuteurTelephone: contrat.tuteurTelephone || '',
        objectifsStage: contrat.objectifsStage || '',
        dureeSemaines: contrat.dureeSemaines || null,
        descriptionPrestation: contrat.descriptionPrestation || '',
        modalitesPaiement: contrat.modalitesPaiement || '',
        dureeMoisPrestation: contrat.dureeMoisPrestation || null,
        estRenouvelable: contrat.estRenouvelable || false,
        renouvellementMax: contrat.renouvellementMax || null,
        observations: contrat.observations || ''
      });
      this.updateFormFields(contrat.typeContrat);
    } else {
      this.form.reset({ statut: 'ACTIF', estRenouvelable: false });
      this.updateFormFields('CDI');
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.reset({ statut: 'ACTIF', estRenouvelable: false });
    this.selectedFiles = [];
    this.selectedContratId = null;
    this.editMode.set(false);
  }

  openDetail(contrat: any): void {
    this.selectedContratForDetail.set(contrat);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedContratForDetail.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitContrat(false);
  }

  private submitContrat(replaceActive: boolean): void {
    const values = this.form.value;
    const request: any = {
      employeeId: values.employeeId,
      typeContrat: values.typeContrat,
      dateDebut: values.dateDebut,
      dateFin: values.dateFin || null,
      dateFinEssai: values.dateFinEssai || null,
      dureeEssaiMois: values.dureeEssaiMois || null,
      statut: values.statut,
      salaireBrut: values.salaireBrut ? parseFloat(values.salaireBrut) : null,
      salaireNet: values.salaireNet ? parseFloat(values.salaireNet) : null,
      tauxHoraire: values.tauxHoraire ? parseFloat(values.tauxHoraire) : null,
      nombreHeuresSemaine: values.nombreHeuresSemaine ? parseInt(values.nombreHeuresSemaine) : null,
      motifRecours: values.motifRecours || null,
      dureeMois: values.dureeMois ? parseInt(values.dureeMois) : null,
      etablissement: values.etablissement || null,
      tuteurNom: values.tuteurNom || null,
      tuteurEmail: values.tuteurEmail || null,
      tuteurTelephone: values.tuteurTelephone || null,
      objectifsStage: values.objectifsStage || null,
      dureeSemaines: values.dureeSemaines ? parseInt(values.dureeSemaines) : null,
      descriptionPrestation: values.descriptionPrestation || null,
      modalitesPaiement: values.modalitesPaiement || null,
      dureeMoisPrestation: values.dureeMoisPrestation ? parseInt(values.dureeMoisPrestation) : null,
      estRenouvelable: values.estRenouvelable || false,
      renouvellementMax: values.renouvellementMax ? parseInt(values.renouvellementMax) : null,
      observations: values.observations || null
    };

    this.isLoading.set(true);

    // CORRECTION : si on est en mode édition, on appelle update()
    if (this.editMode() && this.selectedContratId) {
      this.contratService.update(this.selectedContratId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated: Contrat) => {
            this.updateContratInList(updated);
            this.isLoading.set(false);
            this.closeModal();
            this.showToast('Contrat modifié avec succès');
          },
          error: (err) => {
            this.isLoading.set(false);
            console.error('Erreur mise à jour:', err);
            this.showToast('Erreur lors de la modification du contrat', true);
          }
        });
    } else {
      // Création
      this.contratService.createContrat(request, this.selectedFiles, replaceActive)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created: Contrat) => {
            this.contrats.update(list => [...list, created]);
            this.applyFilters();
            this.isLoading.set(false);
            this.closeModal();
            this.showToast('Contrat créé avec succès');
          },
          error: (err) => {
            if (err.status === 409) {
              this.isLoading.set(false);
              const confirmReplace = confirm(
                'Cet employé possède déjà un contrat actif. Voulez-vous le remplacer par ce nouveau contrat ?'
              );
              if (confirmReplace) {
                this.submitContrat(true);
              } else {
                this.showToast('Opération annulée', true);
              }
            } else {
              this.isLoading.set(false);
              this.showToast('Erreur lors de la création du contrat', true);
            }
          }
        });
    }
  }

  renouveler(contrat: any): void {
    const dateFin = prompt('Nouvelle date de fin (YYYY-MM-DD) :', contrat.dateFin || '');
    if (!dateFin) return;
    this.isLoading.set(true);
    this.contratService.renouveler({ contratId: contrat.id, nouvelleDateFin: dateFin }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated: Contrat) => {
        this.updateContratInList(updated);
        this.isLoading.set(false);
        this.showToast('Contrat renouvelé avec succès');
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Erreur lors du renouvellement', true);
      }
    });
  }

  resilier(contrat: any): void {
    if (!confirm(`Voulez-vous vraiment résilier le contrat de ${contrat.employeeName} ?`)) return;
    this.isLoading.set(true);
    this.contratService.resilier(contrat.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const updated = { ...contrat, statut: 'RESILIE' as StatutContrat };
        this.updateContratInList(updated);
        this.isLoading.set(false);
        this.showToast('Contrat résilié');
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Erreur lors de la résiliation', true);
      }
    });
  }

  archiver(contrat: any): void {
    if (!confirm(`Archiver le contrat de ${contrat.employeeName} ?`)) return;
    this.isLoading.set(true);
    this.contratService.archiver(contrat.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const updated = { ...contrat, statut: 'ARCHIVE' as StatutContrat };
        this.updateContratInList(updated);
        this.isLoading.set(false);
        this.showToast('Contrat archivé');
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Erreur lors de l\'archivage', true);
      }
    });
  }

  viewImages(contrat: any): void {
    if (contrat.imageUrls && contrat.imageUrls.length) {
      alert('Images disponibles :\n' + contrat.imageUrls.join('\n'));
    } else {
      alert('Aucune image associée à ce contrat');
    }
  }

  private updateContratInList(updated: Contrat): void {
    const current = this.contrats();
    const index = current.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      current[index] = updated;
      this.contrats.set([...current]);
      this.applyFilters();
    }
  }

  private showToast(message: string, error: boolean = false): void {
    this.successMessage.set(message);
    this.isErrorToast.set(error);
    this.showSuccessToast.set(true);
    setTimeout(() => {
      this.showSuccessToast.set(false);
    }, 4000);
  }

  openImage(url: string): void {
    window.open(url, '_blank');
  }
}