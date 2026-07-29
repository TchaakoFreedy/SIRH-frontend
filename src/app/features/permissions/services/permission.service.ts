// src/app/features/permissions/services/permission.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '../models/permission.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  // ✅ CORRECTION : environment.apiUrl contient déjà '/api'
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`); // ✅ Plus de /api en double
  }

  getPermissionById(id: string): Observable<Permission> {
    return this.http.get<Permission>(`${this.apiUrl}/permissions/${id}`);
  }

  createPermission(request: CreatePermissionRequest): Observable<Permission> {
    return this.http.post<Permission>(`${this.apiUrl}/permissions`, request);
  }

  updatePermission(id: string, request: UpdatePermissionRequest): Observable<Permission> {
    return this.http.put<Permission>(`${this.apiUrl}/permissions/${id}`, request);
  }

  deletePermission(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/permissions/${id}`);
  }
}