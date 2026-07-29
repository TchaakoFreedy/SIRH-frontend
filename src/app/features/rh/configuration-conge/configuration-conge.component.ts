import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfigurationCongeService } from '../../../core/services/configuration-conge.service';
import { PermissionService } from '../../../core/services/permission.service';
import { EmployeService } from '../../../core/services/employe.service';
import { NotificationService, ToastMessage } from '../../../core/services/notification.service';
import { ConfigurationConge } from '../../../core/models/configuration-conge.model';
import { Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-configuration-conge',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './configuration-conge.component.html',
  styleUrls: ['./configuration-conge.component.css']
})
export class ConfigurationCongeComponent implements OnInit, OnDestroy {
  // Toutes les configurations
  configurations: ConfigurationConge[] = [];
  isLoading = false;

  // Notifications (toasts)
  notifications: ToastMessage[] = [];
  private notifSub!: Subscription;

  // Employés
  employees: Employee[] = [];
  employeesLoading = false;

  // Configuration globale
  globalConfig: ConfigurationConge = {
    nom: 'Configuration globale',
    type: 'GLOBALE',
    joursDeBase: 24,
    bonusEnfantActif: false,
    joursParEnfant: 2,
    ageMaxEnfant: 7,
    genre: null,
    employeeId: null
  };
  globalConfigLoading = false;

  // Configuration individuelle
  individualConfig: ConfigurationConge = this.getDefaultIndividualConfig();
  individualConfigLoading = false;
  isNewIndividual = false;
  individualSearchTerm: string = '';
  filteredIndividualEmployees: Employee[] = [];
  showDropdown = false;

  // Permissions
  canManage = false;

  constructor(
    private configService: ConfigurationCongeService,
    private permissionService: PermissionService,
    private employeService: EmployeService,
    public notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Souscription aux toasts – on stocke chaque toast dans le tableau
    this.notifSub = this.notificationService.toast$.subscribe((toast) => {
      if (toast.id && toast.message) {
        // Ajout du toast
        this.notifications = [...this.notifications, toast];
        // Suppression automatique après 5 secondes
        setTimeout(() => {
          this.notifications = this.notifications.filter(t => t.id !== toast.id);
          this.cdr.detectChanges();
        }, 5000);
        this.cdr.detectChanges();
      } else {
        // Suppression explicite (via le bouton "remove")
        this.notifications = this.notifications.filter(t => t.id !== toast.id);
        this.cdr.detectChanges();
      }
    });

    this.canManage = this.permissionService.hasPermissionSync('SYSTEM_ADMIN') ||
                     this.permissionService.hasPermissionSync('RH');
    if (this.canManage) {
      this.loadEmployees();
      this.loadConfigurations();
    } else {
      this.notificationService.error('Vous n\'avez pas les droits pour gérer les configurations.');
    }
  }

  ngOnDestroy(): void {
    if (this.notifSub) {
      this.notifSub.unsubscribe();
    }
  }

  // ==========================================
  // MÉTHODES DE CHARGEMENT
  // ==========================================

  loadEmployees(): void {
    this.employeesLoading = true;
    this.employeService.getAll().subscribe({
      next: (data) => {
        this.employees = data;
        this.filteredIndividualEmployees = data;
        this.employeesLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement employés:', err);
        this.employeesLoading = false;
        this.notificationService.error('Impossible de charger la liste des employés.');
        this.cdr.detectChanges();
      }
    });
  }

  loadConfigurations(): void {
    this.isLoading = true;
    this.configService.getAll().subscribe({
      next: (data) => {
        this.configurations = data;
        this.isLoading = false;
        this.extractGlobalConfig();
        this.filteredIndividualEmployees = this.employees;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement configs:', err);
        this.isLoading = false;
        this.notificationService.error('Impossible de charger les configurations.');
        this.cdr.detectChanges();
      }
    });
  }

  private extractGlobalConfig(): void {
    const global = this.configurations.find(c => c.type === 'GLOBALE');
    if (global) {
      this.globalConfig = { ...global };
    } else {
      this.globalConfig = {
        nom: 'Configuration globale',
        type: 'GLOBALE',
        joursDeBase: 24,
        bonusEnfantActif: false,
        joursParEnfant: 2,
        ageMaxEnfant: 7,
        genre: null,
        employeeId: null
      };
    }
  }

  // ==========================================
  // RECHERCHE EMPLOYÉ (INDIVIDUELLE)
  // ==========================================

  onIndividualSearchChange(): void {
    const term = this.individualSearchTerm?.toLowerCase().trim() || '';
    if (!term) {
      this.filteredIndividualEmployees = this.employees;
      this.showDropdown = false;
      return;
    }
    this.filteredIndividualEmployees = this.employees.filter(emp =>
      emp.prenom?.toLowerCase().includes(term) ||
      emp.nom?.toLowerCase().includes(term) ||
      emp.matriculeInterne?.toLowerCase().includes(term) ||
      emp.matricule_interne?.toLowerCase().includes(term)
    );
    this.showDropdown = this.filteredIndividualEmployees.length > 0;
    this.cdr.detectChanges();
  }

  selectIndividualEmployee(emp: Employee): void {
    this.individualConfig.employeeId = emp.id!;
    this.individualSearchTerm = `${emp.prenom} ${emp.nom} (${emp.matriculeInterne || emp.matricule_interne})`;
    this.filteredIndividualEmployees = [];
    this.showDropdown = false;
    this.loadIndividualConfig(emp.id!);
    this.cdr.detectChanges();
  }

  clearIndividualSelection(): void {
    this.individualConfig = this.getDefaultIndividualConfig();
    this.isNewIndividual = false;
    this.individualSearchTerm = '';
    this.filteredIndividualEmployees = this.employees;
    this.showDropdown = false;
    this.cdr.detectChanges();
  }

  closeDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.cdr.detectChanges();
    }, 200);
  }

  private loadIndividualConfig(employeeId: string): void {
    this.individualConfigLoading = true;
    this.cdr.detectChanges();
    this.configService.getForEmployee(employeeId).subscribe({
      next: (config) => {
        this.individualConfig = { ...config };
        this.isNewIndividual = false;
        this.individualConfigLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 404) {
          this.individualConfig = {
            ...this.getDefaultIndividualConfig(),
            employeeId: employeeId,
            nom: `Configuration individuelle - ${this.getEmployeeName(employeeId)}`
          };
          this.isNewIndividual = true;
          this.individualConfigLoading = false;
          this.cdr.detectChanges();
        } else {
          console.error('Erreur chargement config individuelle:', err);
          this.individualConfigLoading = false;
          this.notificationService.error('Impossible de charger la configuration individuelle.');
          this.cdr.detectChanges();
        }
      }
    });
  }

  // ==========================================
  // SAUVEGARDE CONFIGURATION GLOBALE
  // ==========================================

  saveGlobalConfig(): void {
    this.globalConfigLoading = true;
    this.cdr.detectChanges();
    const configToSend = { ...this.globalConfig };
    configToSend.type = 'GLOBALE';
    configToSend.genre = null;
    configToSend.employeeId = null;

    if (this.globalConfig.id) {
      this.configService.update(this.globalConfig.id, configToSend).subscribe({
        next: (updated) => {
          this.globalConfig = { ...updated };
          this.globalConfigLoading = false;
          const index = this.configurations.findIndex(c => c.id === updated.id);
          if (index !== -1) this.configurations[index] = updated;
          else this.configurations.push(updated);
          this.notificationService.success('Configuration globale mise à jour !');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.globalConfigLoading = false;
          this.notificationService.error(err.message || 'Erreur lors de la mise à jour.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.configService.create(configToSend).subscribe({
        next: (created) => {
          this.globalConfig = { ...created };
          this.globalConfigLoading = false;
          this.configurations.push(created);
          this.notificationService.success('Configuration globale créée !');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.globalConfigLoading = false;
          this.notificationService.error(err.message || 'Erreur lors de la création.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ==========================================
  // SAUVEGARDE CONFIGURATION INDIVIDUELLE
  // ==========================================

  saveIndividualConfig(): void {
    if (!this.individualConfig.employeeId) {
      this.notificationService.warning('Veuillez sélectionner un employé.');
      return;
    }
    if (this.individualConfigLoading) {
      return;
    }

    const configToSend = { ...this.individualConfig };
    configToSend.type = 'INDIVIDUELLE';
    configToSend.genre = null;

    this.individualConfigLoading = true;
    this.cdr.detectChanges();

    if (this.isNewIndividual || !this.individualConfig.id) {
      this.configService.create(configToSend).subscribe({
        next: (created) => {
          this.individualConfig = { ...created };
          this.isNewIndividual = false;
          this.individualConfigLoading = false;
          const existingIndex = this.configurations.findIndex(c => c.id === created.id);
          if (existingIndex === -1) {
            this.configurations.push(created);
          } else {
            this.configurations[existingIndex] = created;
          }
          const employeeName = this.getEmployeeName(created.employeeId ?? null);
          this.notificationService.success(`Configuration individuelle créée pour ${employeeName}`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.individualConfigLoading = false;
          this.notificationService.error(err.message || 'Erreur lors de la création.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.configService.update(this.individualConfig.id!, configToSend).subscribe({
        next: (updated) => {
          this.individualConfig = { ...updated };
          this.isNewIndividual = false;
          this.individualConfigLoading = false;
          const index = this.configurations.findIndex(c => c.id === updated.id);
          if (index !== -1) {
            this.configurations[index] = updated;
          } else {
            this.configurations.push(updated);
          }
          const employeeName = this.getEmployeeName(updated.employeeId ?? null);
          this.notificationService.success(`Configuration individuelle mise à jour pour ${employeeName}`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.individualConfigLoading = false;
          this.notificationService.error(err.message || 'Erreur lors de la mise à jour.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ==========================================
  // SUPPRESSION
  // ==========================================

  deleteConfig(id: string): void {
    if (!id) return;
    if (!confirm('Supprimer cette configuration ?')) return;

    const index = this.configurations.findIndex(c => c.id === id);
    if (index !== -1) {
      this.configurations.splice(index, 1);
    }
    if (this.globalConfig.id === id) {
      this.globalConfig = {
        nom: 'Configuration globale',
        type: 'GLOBALE',
        joursDeBase: 24,
        bonusEnfantActif: false,
        joursParEnfant: 2,
        ageMaxEnfant: 7,
        genre: null,
        employeeId: null
      };
    }

    this.configService.delete(id).subscribe({
      next: () => {
        this.notificationService.success('Configuration supprimée.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadConfigurations();
        this.notificationService.error(err.message || 'Erreur lors de la suppression.');
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getDefaultIndividualConfig(): ConfigurationConge {
    return {
      nom: '',
      type: 'INDIVIDUELLE',
      joursDeBase: 24,
      bonusEnfantActif: false,
      joursParEnfant: 2,
      ageMaxEnfant: 7,
      genre: null,
      employeeId: null
    };
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'GLOBALE': 'Globale',
      'GENRE': 'Par genre',
      'INDIVIDUELLE': 'Individuelle'
    };
    return map[type] || type;
  }

  getEmployeeName(id: string | null | undefined): string {
    if (!id) return 'N/A';
    const emp = this.employees.find(e => e.id === id);
    return emp ? `${emp.prenom} ${emp.nom}` : id;
  }

  // Méthode pour supprimer un toast localement
  removeToast(id: number): void {
    this.notifications = this.notifications.filter(t => t.id !== id);
    this.cdr.detectChanges();
  }
}