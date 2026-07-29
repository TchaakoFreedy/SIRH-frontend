// src/app/features/roles/services/role.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Role, CreateRoleRequest, RolePermissionsUpdateRequest } from '../models/role.model';
import { PermissionService } from '../../permissions/services/permission.service';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  // ✅ CORRECTION : environment.apiUrl contient déjà '/api'
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private permissionService: PermissionService
  ) {}

  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`); // ✅ Plus de /api en double
  }

  getRoleById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/roles/${id}`);
  }

  getRoleWithPermissions(id: string): Observable<Role> {
    return this.getRoleById(id).pipe(
      map(role => {
        // Charger les permissions associées
        // Note: Les permissions sont chargées séparément via PermissionService
        return role;
      })
    );
  }

  createRole(request: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/roles`, request);
  }

  updateRole(id: string, request: CreateRoleRequest): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/roles/${id}`, request);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
  }

  updateRolePermissions(id: string, request: RolePermissionsUpdateRequest): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/roles/${id}/permissions`, request);
  }
}