// services/notification.service.ts - Updated
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id: string;
  message: string;
  date: string;
  lu: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getNotifications(): Observable<Notification[]> {
    // Tenter de récupérer depuis l'API
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/read-all`, {});
  }

  markAllAsSeen(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/seen`, {});
  }
}