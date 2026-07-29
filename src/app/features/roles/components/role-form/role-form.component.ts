// src/app/features/roles/components/role-form/role-form.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../../permissions/services/permission.service';
import { Permission } from '../../../permissions/models/permission.model';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class RoleFormComponent implements OnInit {
  roleForm: FormGroup;
  isEditMode = false;
  roleId: string | null = null;
  isLoading = false;
  isSaving = false;
  permissions: Permission[] = [];
  filteredPermissions: Permission[] = [];
  selectedPermissions: string[] = [];
  permissionSearch = '';

  visibilityScopes = ['GLOBAL', 'COMPANY', 'DEPARTMENT', 'TEAM', 'SELF'];

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
      hierarchyLevel: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      visibilityScope: ['', Validators.required],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.roleId = this.route.snapshot.paramMap.get('id');
    console.log('🆔 ID du rôle:', this.roleId);
    if (this.roleId) {
      this.isEditMode = true;
      this.loadRole(this.roleId);
    }
  }

  loadPermissions(): void {
    console.log('🔄 Chargement des permissions...');
    this.permissionService.getAllPermissions()
      .pipe(
        finalize(() => {
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('✅ Permissions chargées:', data.length);
          this.permissions = data || [];
          this.filterPermissions();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement permissions:', error);
          this.toastr.error('Erreur lors du chargement des permissions', 'Erreur');
          this.permissions = [];
          this.cdr.detectChanges();
        }
      });
  }

  filterPermissions(): void {
    if (!this.permissionSearch || this.permissionSearch.trim() === '') {
      this.filteredPermissions = this.permissions;
    } else {
      const term = this.permissionSearch.toLowerCase().trim();
      this.filteredPermissions = this.permissions.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
    }
    this.cdr.detectChanges();
  }

  loadRole(id: string): void {
    console.log('🔄 Chargement du rôle...');
    this.isLoading = true;
    this.roleService.getRoleById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (role) => {
          console.log('✅ Rôle chargé:', role);
          this.roleForm.patchValue({
            name: role.name,
            description: role.description,
            hierarchyLevel: role.hierarchyLevel,
            visibilityScope: role.visibilityScope,
            active: role.active
          });
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

  onPermissionSearch(): void {
    this.filterPermissions();
  }

  getSelectedPermissionsCount(): number {
    return this.selectedPermissions.length;
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.toastr.warning('Veuillez corriger les erreurs du formulaire', 'Attention');
      return;
    }

    console.log('💾 Sauvegarde du rôle...');
    this.isSaving = true;
    const formData = this.roleForm.value;

    const request = {
      name: formData.name,
      description: formData.description,
      hierarchyLevel: formData.hierarchyLevel,
      permissionIds: this.selectedPermissions,
      visibilityScope: formData.visibilityScope,
      active: formData.active
    };

    if (this.isEditMode && this.roleId) {
      this.roleService.updateRole(this.roleId, request)
        .pipe(
          finalize(() => {
            this.isSaving = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success('Rôle mis à jour avec succès', 'Succès');
            this.router.navigate(['/app/admin/roles']);
          },
          error: (error) => {
            console.error('❌ Erreur mise à jour:', error);
            this.toastr.error('Erreur lors de la mise à jour', 'Erreur');
          }
        });
    } else {
      this.roleService.createRole(request)
        .pipe(
          finalize(() => {
            this.isSaving = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success('Rôle créé avec succès', 'Succès');
            this.router.navigate(['/app/admin/roles']);
          },
          error: (error) => {
            console.error('❌ Erreur création:', error);
            this.toastr.error('Erreur lors de la création', 'Erreur');
          }
        });
    }
  }

  goBack(): void {
    this.location.back();
  }

  get f() {
    return this.roleForm.controls;
  }

  getLevelLabel(level: number): string {
    const labels: {[key: number]: string} = {
      5: 'RH (Accès total)',
      4: 'TOP MANAGER (Global)',
      3: 'DIRECTION (Company)',
      2: 'MANAGER (Team)',
      1: 'EMPLOYEE (Self)'
    };
    return labels[level] || `Niveau ${level}`;
  }
}