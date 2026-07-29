// src/app/features/permissions/components/permission-detail/permission-detail.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-permission-detail',
  templateUrl: './permission-detail.component.html',
  styleUrls: ['./permission-detail.component.scss'],
  imports: [CommonModule, RouterModule]
})
export class PermissionDetailComponent implements OnInit {
  permission: Permission | null = null;
  isLoading = false;
  isDeleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('🆔 ID de la permission:', id);
    if (id) {
      this.loadPermission(id);
    } else {
      this.goBack();
    }
  }

  loadPermission(id: string): void {
    console.log('🔄 Chargement de la permission...');
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.permissionService.getPermissionById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          console.log('🏁 Fin du chargement, isLoading:', this.isLoading);
        })
      )
      .subscribe({
        next: (permission) => {
          console.log('✅ Permission chargée:', permission);
          this.permission = permission;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement permission:', error);
          this.toastr.error('Permission non trouvée', 'Erreur');
          this.cdr.detectChanges();
          this.goBack();
        }
      });
  }

  goBack(): void {
    this.location.back();
  }

  editPermission(): void {
    if (this.permission) {
      console.log('✏️ Navigation vers édition:', this.permission.id);
      this.router.navigate(['/app/admin/permissions/edit', this.permission.id]);
    }
  }

  deletePermission(): void {
    if (this.permission && confirm(`Êtes-vous sûr de vouloir supprimer la permission "${this.permission.name}" ?`)) {
      console.log('🗑️ Suppression de la permission:', this.permission.id);
      this.isDeleting = true;
      this.cdr.detectChanges();
      
      this.permissionService.deletePermission(this.permission.id)
        .pipe(
          finalize(() => {
            this.isDeleting = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success('Permission supprimée avec succès', 'Succès');
            this.router.navigate(['/app/admin/permissions']);
          },
          error: (error) => {
            console.error('❌ Erreur suppression:', error);
            this.toastr.error('Erreur lors de la suppression', 'Erreur');
            this.cdr.detectChanges();
          }
        });
    }
  }

  getCategoryBadgeClass(category: string): string {
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