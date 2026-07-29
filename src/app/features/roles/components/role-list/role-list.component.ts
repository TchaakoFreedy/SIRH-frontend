// src/app/features/roles/components/role-list/role-list.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../services/role.service';
import { Role } from '../../models/role.model';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class RoleListComponent implements OnInit, OnDestroy {
  roles: Role[] = [];
  filteredRoles: Role[] = [];
  isLoading = false;
  searchTerm = '';
  private destroy$ = new Subject<void>();

  constructor(
    private roleService: RoleService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getAllRoles()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Rôles chargés:', data);
          this.roles = data || [];
          this.filterRoles();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur chargement rôles:', error);
          this.toastr.error('Erreur lors du chargement des rôles', 'Erreur');
          this.roles = [];
          this.filteredRoles = [];
          this.cdr.detectChanges();
        }
      });
  }

  filterRoles(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredRoles = this.roles;
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredRoles = this.roles.filter(role =>
        role.name.toLowerCase().includes(term) ||
        (role.description && role.description.toLowerCase().includes(term))
      );
    }
    this.cdr.detectChanges();
  }

  onSearch(): void {
    this.filterRoles();
  }

  viewRole(id: string): void {
    this.router.navigate(['/app/admin/roles', id]);
  }

  editRole(id: string): void {
    this.router.navigate(['/app/admin/roles/edit', id]);
  }

  managePermissions(id: string): void {
    this.router.navigate(['/app/admin/roles', id, 'permissions']);
  }

  deleteRole(id: string, name: string): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${name}" ?`)) {
      this.isLoading = true;
      this.roleService.deleteRole(id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success(`Rôle "${name}" supprimé avec succès`, 'Succès');
            this.loadRoles();
          },
          error: (error) => {
            this.toastr.error('Erreur lors de la suppression', 'Erreur');
            this.cdr.detectChanges();
          }
        });
    }
  }

  createRole(): void {
    this.router.navigate(['/app/admin/roles/create']);
  }

  getLevelBadgeClass(level: number): string {
    if (level >= 5) return 'bg-danger';
    if (level >= 4) return 'bg-warning';
    if (level >= 3) return 'bg-info';
    if (level >= 2) return 'bg-primary';
    return 'bg-secondary';
  }
}