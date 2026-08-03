import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
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
  private configService = inject(ConfigurationCongeService);
  private permissionService = inject(PermissionService);
  private employeService = inject(EmployeService);
  public notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // Toutes les configurations
  configurations: ConfigurationConge[] = [];
  isLoading = false;

  // Notifications
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
    joursParEnfant: 0,
    ageMaxEnfant: 0,
    genre: null,
    employeeId: null
  };
  globalConfigLoading = false;
  showGlobalForm = false;

  // Configuration individuelle
  individualConfig: ConfigurationConge = this.getDefaultIndividualConfig();
  individualConfigLoading = false;
  isNewIndividual = false;
  selectedEmployeeId: string = '';
  showIndividualForm = false;

  // Permissions
  canManage = false;

  ngOnInit(): void {
    this.notifSub = this.notificationService.toast$.subscribe((toast) => {
      if (toast.id && toast.message) {
        this.notifications = [...this.notifications, toast];
        setTimeout(() => {
          this.notifications = this.notifications.filter(t => t.id !== toast.id);
          this.cdr.detectChanges();
        }, 5000);
        this.cdr.detectChanges();
      } else {
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
  // TOGGLE
  // ==========================================

  toggleGlobalForm(): void {
    this.showGlobalForm = !this.showGlobalForm;
  }

  toggleIndividualForm(): void {
    this.showIndividualForm = !this.showIndividualForm;
    if (this.showIndividualForm && this.employees.length === 0) {
      this.loadEmployees();
    }
  }

  // ==========================================
  // CHARGEMENT
  // ==========================================

  loadEmployees(): void {
    this.employeesLoading = true;
    this.employeService.getAll().subscribe({
      next: (data) => {
        this.employees = data;
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
    }
  }

  // ==========================================
  // SÉLECTION EMPLOYÉ
  // ==========================================

  onEmployeeSelect(): void {
    if (!this.selectedEmployeeId) {
      this.individualConfig = this.getDefaultIndividualConfig();
      this.isNewIndividual = false;
      return;
    }
    this.loadIndividualConfig(this.selectedEmployeeId);
  }

  private loadIndividualConfig(employeeId: string): void {
    this.individualConfigLoading = true;
    this.cdr.detectChanges();
    
    this.configService.getOrCreateIndividual(employeeId).subscribe({
      next: (config) => {
        this.individualConfig = { ...config };
        this.isNewIndividual = false;
        this.individualConfigLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement config individuelle:', err);
        this.configService.getForEmployee(employeeId).subscribe({
          next: (config) => {
            this.individualConfig = { ...config };
            this.isNewIndividual = false;
            this.individualConfigLoading = false;
            this.cdr.detectChanges();
          },
          error: (err2) => {
            if (err2.status === 404) {
              this.individualConfig = {
                ...this.getDefaultIndividualConfig(),
                employeeId: employeeId,
                nom: `Configuration - ${this.getEmployeeName(employeeId)}`
              };
              this.isNewIndividual = true;
              this.individualConfigLoading = false;
              this.cdr.detectChanges();
            } else {
              console.error('Erreur:', err2);
              this.individualConfigLoading = false;
              this.notificationService.error('Impossible de charger la configuration.');
              this.cdr.detectChanges();
            }
          }
        });
      }
    });
  }

  // ==========================================
  // SAUVEGARDE
  // ==========================================

  saveGlobalConfig(): void {
    this.globalConfigLoading = true;
    this.cdr.detectChanges();
    const configToSend = { ...this.globalConfig };
    configToSend.type = 'GLOBALE';
    configToSend.genre = null;
    configToSend.employeeId = null;
    // Désactiver le bonus enfant
    configToSend.bonusEnfantActif = false;
    configToSend.joursParEnfant = 0;
    configToSend.ageMaxEnfant = 0;

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

  saveIndividualConfig(): void {
    if (!this.individualConfig.employeeId) {
      this.notificationService.warning('Veuillez sélectionner un employé.');
      return;
    }
    if (this.individualConfigLoading) return;

    const configToSend = { ...this.individualConfig };
    configToSend.type = 'INDIVIDUELLE';
    configToSend.genre = null;
    // Désactiver le bonus enfant
    configToSend.bonusEnfantActif = false;
    configToSend.joursParEnfant = 0;
    configToSend.ageMaxEnfant = 0;

    this.individualConfigLoading = true;
    this.cdr.detectChanges();

    if (this.isNewIndividual || !this.individualConfig.id) {
      this.configService.create(configToSend).subscribe({
        next: (created) => {
          this.individualConfig = { ...created };
          this.isNewIndividual = false;
          this.individualConfigLoading = false;
          const existingIndex = this.configurations.findIndex(c => c.id === created.id);
          if (existingIndex === -1) this.configurations.push(created);
          else this.configurations[existingIndex] = created;
          const employeeName = this.getEmployeeName(created.employeeId ?? null);
          this.notificationService.success(`Configuration créée pour ${employeeName}`);
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
          if (index !== -1) this.configurations[index] = updated;
          else this.configurations.push(updated);
          const employeeName = this.getEmployeeName(updated.employeeId ?? null);
          this.notificationService.success(`Configuration mise à jour pour ${employeeName}`);
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
    if (index !== -1) this.configurations.splice(index, 1);
    if (this.globalConfig.id === id) {
      this.globalConfig = {
        nom: 'Configuration globale',
        type: 'GLOBALE',
        joursDeBase: 24,
        bonusEnfantActif: false,
        joursParEnfant: 0,
        ageMaxEnfant: 0,
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
      joursParEnfant: 0,
      ageMaxEnfant: 0,
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

  removeToast(id: number): void {
    this.notifications = this.notifications.filter(t => t.id !== id);
    this.cdr.detectChanges();
  }
}