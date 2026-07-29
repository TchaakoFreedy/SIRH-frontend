// src/app/features/user-permissions/services/user-permission.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserPermissions, UserPermissionsUpdateRequest } from '../models/user-permissions.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserPermissionService {
  // ✅ CORRECTION : environment.apiUrl contient déjà '/api'
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUserPermissions(userId: string): Observable<UserPermissions> {
    return this.http.get<UserPermissions>(`${this.apiUrl}/users/${userId}/permissions`); // ✅ Plus de /api en double
  }

  updateUserPermissions(userId: string, request: UserPermissionsUpdateRequest): Observable<UserPermissions> {
    return this.http.put<UserPermissions>(`${this.apiUrl}/users/${userId}/permissions`, request);
  }
}