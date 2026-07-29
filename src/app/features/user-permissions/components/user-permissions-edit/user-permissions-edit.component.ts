// src/app/features/user-permissions/components/user-permissions-edit/user-permissions-edit.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserPermissionService } from '../../services/user-permission.service';
import { PermissionService } from '../../../permissions/services/permission.service';
import { UserPermissions, UserPermissionsUpdateRequest } from '../../models/user-permissions.model';
import { Permission } from '../../../permissions/models/permission.model';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-permissions-edit',
  templateUrl: './user-permissions-edit.component.html',
  styleUrls: ['./user-permissions-edit.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class UserPermissionsEditComponent implements OnInit, OnDestroy {
  public Math = Math; // pour usage éventuel dans le template

  userPermissions: UserPermissions | null = null;
  allPermissions: Permission[] = [];
  userId: string | null = null;
  isLoading = false;
  isSaving = false;
  grantedIds: Set<string> = new Set();
  revokedIds: Set<string> = new Set();
  searchTerm = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userPermissionService: UserPermissionService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId');
    console.log('🆔 UserPermissionsEditComponent - userId:', this.userId);
    
    if (this.userId) {
      this.loadData();
    } else {
      this.toastr.warning('Aucun utilisateur sélectionné', 'Attention');
      this.goBack();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    console.log('🔄 Chargement des permissions disponibles...');
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.permissionService.getAllPermissions()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (permissions) => {
          console.log('✅ Permissions disponibles chargées:', permissions.length);
          this.allPermissions = permissions || [];
          this.cdr.detectChanges();
          this.loadUserPermissions();
        },
        error: (error) => {
          console.error('❌ Erreur chargement permissions:', error);
          this.toastr.error('Erreur lors du chargement des permissions', 'Erreur');
          this.allPermissions = [];
          this.cdr.detectChanges();
        }
      });
  }

  loadUserPermissions(): void {
    if (!this.userId) {
      console.warn('⚠️ Aucun userId disponible');
      return;
    }
    
    console.log('🔄 Chargement des permissions de l\'utilisateur:', this.userId);
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.userPermissionService.getUserPermissions(this.userId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          console.log('🏁 Fin du chargement, isLoading:', this.isLoading);
        })
      )
      .subscribe({
        next: (data) => {
          console.log('✅ Permissions utilisateur chargées:', data);
          this.userPermissions = data;
          this.grantedIds = new Set(data.grantedPermissions?.map(p => p.id) || []);
          this.revokedIds = new Set(data.revokedPermissions?.map(p => p.id) || []);
          console.log('📊 Granted:', this.grantedIds.size, 'Revoked:', this.revokedIds.size);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement permissions utilisateur:', error);
          this.toastr.error('Erreur lors du chargement des permissions utilisateur', 'Erreur');
          this.userPermissions = null;
          this.cdr.detectChanges();
        }
      });
  }

  // ==========================================
  // RECHERCHE
  // ==========================================
  filteredPermissions(): Permission[] {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return this.allPermissions;
    }
    const term = this.searchTerm.toLowerCase().trim();
    return this.allPermissions.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  }

  onSearch(): void {
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.cdr.detectChanges();
  }

  // ==========================================
  // ÉTATS
  // ==========================================
  isGranted(permissionId: string): boolean {
    return this.grantedIds.has(permissionId);
  }

  isRevoked(permissionId: string): boolean {
    return this.revokedIds.has(permissionId);
  }

  isEffective(permissionId: string): boolean {
    const roleHasIt = this.userPermissions?.rolePermissions?.some(p => p.id === permissionId) || false;
    const isGranted = this.isGranted(permissionId);
    const isRevoked = this.isRevoked(permissionId);
    return (roleHasIt || isGranted) && !isRevoked;
  }

  getStatusText(permissionId: string): string {
    if (this.isRevoked(permissionId)) return 'Révoquée';
    if (this.isGranted(permissionId)) return 'Ajoutée';
    return 'Héritée';
  }

  // ==========================================
  // ACTIONS
  // ==========================================
  toggleGrant(permissionId: string): void {
    if (this.grantedIds.has(permissionId)) {
      this.grantedIds.delete(permissionId);
    } else {
      this.grantedIds.add(permissionId);
      this.revokedIds.delete(permissionId);
    }
    this.cdr.detectChanges();
  }

  toggleRevoke(permissionId: string): void {
    if (this.revokedIds.has(permissionId)) {
      this.revokedIds.delete(permissionId);
    } else {
      this.revokedIds.add(permissionId);
      this.grantedIds.delete(permissionId);
    }
    this.cdr.detectChanges();
  }

  savePermissions(): void {
    if (!this.userId) {
      this.toastr.warning('Aucun utilisateur sélectionné', 'Attention');
      return;
    }

    console.log('💾 Sauvegarde des permissions...');
    this.isSaving = true;
    this.cdr.detectChanges();
    
    const request: UserPermissionsUpdateRequest = {
      grantedPermissionIds: Array.from(this.grantedIds),
      revokedPermissionIds: Array.from(this.revokedIds)
    };

    this.userPermissionService.updateUserPermissions(this.userId, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
          console.log('🏁 Fin de la sauvegarde');
        })
      )
      .subscribe({
        next: (data) => {
          console.log('✅ Permissions mises à jour:', data);
          this.toastr.success('Permissions mises à jour avec succès', 'Succès');
          this.router.navigate(['/app/admin/user-permissions', this.userId]);
        },
        error: (error) => {
          console.error('❌ Erreur sauvegarde:', error);
          this.toastr.error('Erreur lors de la mise à jour des permissions', 'Erreur');
          this.cdr.detectChanges();
        }
      });
  }

  resetOverrides(): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les overrides ?')) {
      console.log('🔄 Réinitialisation des overrides');
      this.grantedIds = new Set();
      this.revokedIds = new Set();
      this.cdr.detectChanges();
      this.toastr.info('Overrides réinitialisés', 'Info');
    }
  }

  goBack(): void {
    this.location.back();
  }

  getPermissionCategoryClass(category: string): string {
    const colors: {[key: string]: string} = {
      'SYSTEM': 'bg-primary',
      'USER': 'bg-success',
      'EMPLOYEE': 'bg-info',
      'LEAVE': 'bg-warning',
      'PAYROLL': 'bg-danger',
      'DOC': 'bg-secondary',
      'REPORT': 'bg-dark'
    };
    return colors[category] || 'bg-secondary';
  }
}