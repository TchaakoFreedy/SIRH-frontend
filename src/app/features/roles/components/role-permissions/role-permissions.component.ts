// src/app/features/roles/components/role-permissions/role-permissions.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../../permissions/services/permission.service';
import { Role, RolePermissionsUpdateRequest } from '../../models/role.model';
import { Permission } from '../../../permissions/models/permission.model';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-role-permissions',
  templateUrl: './role-permissions.component.html',
  styleUrls: ['./role-permissions.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class RolePermissionsComponent implements OnInit, OnDestroy {
  role: Role | null = null;
  permissions: Permission[] = [];
  selectedPermissions: string[] = [];
  isLoading = false;
  isSaving = false;
  permissionSearch = '';
  roleId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.roleId = this.route.snapshot.paramMap.get('id');
    console.log('🆔 ID du rôle:', this.roleId);
    if (this.roleId) {
      this.loadData();
    } else {
      this.goBack();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    console.log('🔄 Chargement des données...');
    this.isLoading = true;
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
          console.log('✅ Permissions chargées:', permissions.length);
          this.permissions = permissions || [];
          this.cdr.detectChanges();
          this.loadRole();
        },
        error: (error) => {
          console.error('❌ Erreur chargement permissions:', error);
          this.toastr.error('Erreur lors du chargement des permissions', 'Erreur');
          this.permissions = [];
          this.cdr.detectChanges();
        }
      });
  }

  loadRole(): void {
    if (!this.roleId) {
      console.warn('⚠️ Aucun ID de rôle');
      return;
    }
    
    console.log('🔄 Chargement du rôle...');
    this.roleService.getRoleById(this.roleId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (role) => {
          console.log('✅ Rôle chargé:', role);
          this.role = role;
          this.selectedPermissions = role.permissionIds || [];
          console.log('📊 Permissions sélectionnées:', this.selectedPermissions.length);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement rôle:', error);
          this.toastr.error('Erreur lors du chargement du rôle', 'Erreur');
          this.goBack();
        }
      });
  }

  togglePermission(permissionId: string): void {
    const index = this.selectedPermissions.indexOf(permissionId);
    if (index === -1) {
      this.selectedPermissions.push(permissionId);
    } else {
      this.selectedPermissions.splice(index, 1);
    }
    this.cdr.detectChanges();
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.includes(permissionId);
  }

  filterPermissions(): Permission[] {
    if (!this.permissionSearch || this.permissionSearch.trim() === '') {
      return this.permissions;
    }
    const term = this.permissionSearch.toLowerCase().trim();
    return this.permissions.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  }

  isAllSelected(): boolean {
    return this.permissions.length > 0 && 
           this.selectedPermissions.length === this.permissions.length;
  }

  toggleAll(): void {
    if (this.isAllSelected()) {
      this.selectedPermissions = [];
    } else {
      this.selectedPermissions = this.permissions.map(p => p.id);
    }
    this.cdr.detectChanges();
  }

  getSelectedCount(): number {
    return this.selectedPermissions.length;
  }

  getTotalCount(): number {
    return this.permissions.length;
  }

  savePermissions(): void {
    if (!this.roleId || !this.role) {
      this.toastr.warning('Aucun rôle à mettre à jour', 'Attention');
      return;
    }

    console.log('💾 Sauvegarde des permissions...');
    this.isSaving = true;
    const request: RolePermissionsUpdateRequest = {
      permissionIds: this.selectedPermissions
    };

    this.roleService.updateRolePermissions(this.roleId, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Permissions du rôle mises à jour avec succès', 'Succès');
          this.router.navigate(['/app/admin/roles']);
        },
        error: (error) => {
          console.error('❌ Erreur sauvegarde:', error);
          this.toastr.error('Erreur lors de la mise à jour des permissions', 'Erreur');
        }
      });
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