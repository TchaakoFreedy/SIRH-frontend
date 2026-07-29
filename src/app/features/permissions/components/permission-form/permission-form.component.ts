// src/app/features/permissions/components/permission-form/permission-form.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';

@Component({
  selector: 'app-permission-form',
  templateUrl: './permission-form.component.html',
  styleUrls: ['./permission-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class PermissionFormComponent implements OnInit {
  permissionForm: FormGroup;
  isEditMode = false;
  permissionId: string | null = null;
  isLoading = false;
  isSaving = false;

  categories = [
    'SYSTEM',
    'USER',
    'EMPLOYEE',
    'COMPANY',
    'DEPARTMENT',
    'POSITION',
    'PROFILE',
    'LEAVE',
    'PAYROLL',
    'DOC',
    'CONTRACT',
    'SANCTION',
    'HR_REQUEST',
    'EXPLANATION',
    'TEAM',
    'REPORT'
  ];

  constructor(
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private location: Location
  ) {
    this.permissionForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
      category: ['', Validators.required],
      requiredLevel: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.permissionId = this.route.snapshot.paramMap.get('id');
    if (this.permissionId) {
      this.isEditMode = true;
      this.loadPermission(this.permissionId);
    }
  }

  loadPermission(id: string): void {
    this.isLoading = true;
    this.permissionService.getPermissionById(id).subscribe({
      next: (permission) => {
        this.permissionForm.patchValue({
          name: permission.name,
          description: permission.description,
          category: permission.category,
          requiredLevel: permission.requiredLevel,
          active: permission.active
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.error('Erreur lors du chargement de la permission', 'Erreur');
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  onSubmit(): void {
    if (this.permissionForm.invalid) {
      this.toastr.warning('Veuillez corriger les erreurs du formulaire', 'Attention');
      return;
    }

    this.isSaving = true;
    const formData = this.permissionForm.value;

    if (this.isEditMode && this.permissionId) {
      this.permissionService.updatePermission(this.permissionId, {
        description: formData.description,
        category: formData.category,
        requiredLevel: formData.requiredLevel,
        active: formData.active
      }).subscribe({
        next: () => {
          this.toastr.success('Permission mise à jour avec succès', 'Succès');
          this.router.navigate(['/app/admin/permissions']);
        },
        error: (error) => {
          this.toastr.error('Erreur lors de la mise à jour', 'Erreur');
          this.isSaving = false;
        }
      });
    } else {
      this.permissionService.createPermission({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        requiredLevel: formData.requiredLevel,
        active: formData.active
      }).subscribe({
        next: () => {
          this.toastr.success('Permission créée avec succès', 'Succès');
          this.router.navigate(['/app/admin/permissions']);
        },
        error: (error) => {
          this.toastr.error('Erreur lors de la création', 'Erreur');
          this.isSaving = false;
        }
      });
    }
  }

  goBack(): void {
    this.location.back();
  }

  get f() {
    return this.permissionForm.controls;
  }
}