// src/app/features/user-permissions/components/user-permissions/user-permissions.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserPermissionService } from '../../services/user-permission.service';
import { UserPermissions } from '../../models/user-permissions.model';
import { UserService, User } from '../../../../core/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-permissions',
  templateUrl: './user-permissions.component.html',
  styleUrls: ['./user-permissions.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class UserPermissionsComponent implements OnInit, OnDestroy {
  public Math = Math;

  userPermissions: UserPermissions | null = null;
  users: User[] = [];
  filteredUsers: User[] = [];
  userId: string | null = null;
  isLoading = false;
  isLoadingUsers = false;
  searchTerm = '';
  selectedUserId: string | null = null;
  private destroy$ = new Subject<void>();

  // Statistics
  totalPermissions = 0;
  grantedCount = 0;
  revokedCount = 0;
  effectiveCount = 0;

  // Pagination des permissions
  currentPermissionPage = 1;
  permissionsPerPage = 10;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userPermissionService: UserPermissionService,
    private userService: UserService,
    private toastr: ToastrService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId');
    console.log('🆔 UserPermissionsComponent - userId:', this.userId);
    
    this.loadUsers();
    
    if (this.userId) {
      this.selectedUserId = this.userId;
      this.loadUserPermissions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    console.log('🔄 Chargement de la liste des utilisateurs...');
    this.isLoadingUsers = true;
    this.cdr.detectChanges();
    
    this.userService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingUsers = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (users) => {
          console.log('✅ Utilisateurs chargés:', users.length);
          this.users = users || [];
          this.filterUsers();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement utilisateurs:', error);
          this.toastr.error('Erreur lors du chargement des utilisateurs', 'Erreur');
          this.users = [];
          this.cdr.detectChanges();
        }
      });
  }

  filterUsers(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredUsers = this.users;
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredUsers = this.users.filter(user =>
        user.firstName?.toLowerCase().includes(term) ||
        user.lastName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      );
    }
    this.cdr.detectChanges();
  }

  onSearch(): void {
    this.filterUsers();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterUsers();
  }

  selectUser(userId: string): void {
    console.log('👤 Sélection de l\'utilisateur:', userId);
    this.selectedUserId = userId;
    this.userId = userId;
    
    this.router.navigate(['/app/admin/user-permissions', userId]);
    
    this.loadUserPermissions();
  }

  loadUserPermissions(): void {
    if (!this.userId) {
      console.warn('⚠️ Aucun utilisateur sélectionné');
      return;
    }
    
    console.log('🔄 Chargement des permissions pour l\'utilisateur:', this.userId);
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.userPermissionService.getUserPermissions(this.userId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('✅ Permissions utilisateur chargées:', data);
          this.userPermissions = data;
          this.currentPermissionPage = 1;
          this.calculateStats();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement permissions utilisateur:', error);
          this.toastr.error('Erreur lors du chargement des permissions', 'Erreur');
          this.userPermissions = null;
          this.cdr.detectChanges();
        }
      });
  }

  calculateStats(): void {
    if (!this.userPermissions) return;

    this.totalPermissions = this.userPermissions.rolePermissions?.length || 0;
    this.grantedCount = this.userPermissions.grantedPermissions?.length || 0;
    this.revokedCount = this.userPermissions.revokedPermissions?.length || 0;
    this.effectiveCount = this.userPermissions.effectivePermissions?.length || 0;
    this.cdr.detectChanges();
  }

  // ==========================================
  // PAGINATION DES PERMISSIONS
  // ==========================================

  get totalPermissionPages(): number {
    const total = this.userPermissions?.rolePermissions?.length || 0;
    return Math.ceil(total / this.permissionsPerPage);
  }

  get paginatedPermissions(): any[] {
    if (!this.userPermissions?.rolePermissions) return [];
    const start = (this.currentPermissionPage - 1) * this.permissionsPerPage;
    const end = start + this.permissionsPerPage;
    return this.userPermissions.rolePermissions.slice(start, end);
  }

  changePermissionPage(page: number): void {
    if (page >= 1 && page <= this.totalPermissionPages) {
      this.currentPermissionPage = page;
    }
  }

  getVisiblePermissionPages(): number[] {
    const current = this.currentPermissionPage;
    const total = this.totalPermissionPages;
    const pages: number[] = [];
    const delta = 1;
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  onPermissionsPerPageChange(): void {
    this.currentPermissionPage = 1;
  }

  // ==========================================
  // AUTRES MÉTHODES
  // ==========================================

  editPermissions(): void {
    if (this.userId) {
      console.log('✏️ Navigation vers édition des permissions pour:', this.userId);
      this.router.navigate(['/app/admin/user-permissions', this.userId, 'edit']);
    }
  }

  goBack(): void {
    this.location.back();
  }

  getFullName(user: User): string {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Utilisateur';
  }

  getInitials(user: User): string {
    if (!user) return 'UT';
    const first = user.firstName ? user.firstName.charAt(0) : '';
    const last = user.lastName ? user.lastName.charAt(0) : '';
    return (first + last).toUpperCase() || 'UT';
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

  isPermissionGranted(permissionId: string): boolean {
    if (!this.userPermissions) return false;
    return this.userPermissions.grantedPermissions?.some(p => p.id === permissionId) || false;
  }

  isPermissionRevoked(permissionId: string): boolean {
    if (!this.userPermissions) return false;
    return this.userPermissions.revokedPermissions?.some(p => p.id === permissionId) || false;
  }

  isPermissionEffective(permissionId: string): boolean {
    if (!this.userPermissions) return false;
    return this.userPermissions.effectivePermissions?.some(p => p.id === permissionId) || false;
  }

  getRoleLabel(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      'SUPER_ADMIN': 'Super Admin',
      'RH': 'Ressources Humaines',
      'MANAGER': 'Manager',
      'EMPLOY': 'Employé',
      'EMPLOYEE': 'Employé',
      'DIRECTION': 'Direction',
      'TOP_MANAGER': 'Top Management'
    };
    return roleMap[roleName] || roleName || 'Non défini';
  }
}