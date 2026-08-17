// src/app/core/services/notification.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, interval, switchMap, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationFilter, NotificationPageResponse } from '../models/notification.model';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  // Compteur de non lues
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Système de Toast
  private toastSubject = new Subject<ToastMessage>();
  public toast$ = this.toastSubject.asObservable();
  public notifications$ = this.toast$; // alias pour compatibilité

  // Rafraîchissement de la liste des notifications (déclenché manuellement)
  private refreshNotificationsSubject = new Subject<void>();
  public refreshNotifications$ = this.refreshNotificationsSubject.asObservable();

  private toastIdCounter = 0;
  private pollingSubscription: Subscription | null = null;

  constructor(private http: HttpClient) {}

  // =============================================
  // API NOTIFICATIONS
  // =============================================

  getNotifications(filter?: NotificationFilter, page: number = 0, size: number = 20): Observable<NotificationPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filter) {
      if (filter.recipientId) params = params.set('recipientId', filter.recipientId);
      if (filter.companyId) params = params.set('companyId', filter.companyId);
      if (filter.departmentId) params = params.set('departmentId', filter.departmentId);
      if (filter.read !== undefined) params = params.set('read', filter.read.toString());
      if (filter.event) params = params.set('event', filter.event);
      if (filter.type) params = params.set('type', filter.type);
      if (filter.priority) params = params.set('priority', filter.priority);
      if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
      if (filter.toDate) params = params.set('toDate', filter.toDate);
    }

    return this.http.get<NotificationPageResponse>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread-count`);
  }

  getUnreadNotifications(page: number = 0, size: number = 20): Observable<NotificationPageResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<NotificationPageResponse>(`${this.apiUrl}/unread`, { params });
  }

  getHistory(filter?: NotificationFilter, page: number = 0, size: number = 20): Observable<NotificationPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filter) {
      if (filter.event) params = params.set('event', filter.event);
      if (filter.type) params = params.set('type', filter.type);
      if (filter.priority) params = params.set('priority', filter.priority);
      if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
      if (filter.toDate) params = params.set('toDate', filter.toDate);
    }

    return this.http.get<NotificationPageResponse>(`${this.apiUrl}/history`, { params });
  }

  markAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
  }

  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }

  // =============================================
  // POLLING
  // =============================================

  startPolling(intervalMs: number = 60000): void {
    if (this.pollingSubscription) this.stopPolling();
    this.pollingSubscription = interval(intervalMs).pipe(
      switchMap(() => this.getUnreadCount())
    ).subscribe({
      next: (count) => this.unreadCountSubject.next(count),
      error: (err) => console.error('Erreur polling notifications:', err)
    });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (count) => this.unreadCountSubject.next(count),
      error: (err) => console.error('Erreur refresh unread count:', err)
    });
  }

  // Déclenche le rafraîchissement de la liste des notifications
  triggerRefresh(): void {
    this.refreshNotificationsSubject.next();
  }

  // =============================================
  // TOAST
  // =============================================

  private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    const id = ++this.toastIdCounter;
    this.toastSubject.next({ id, type, message });
    setTimeout(() => this.remove(id), 5000);
  }

  success(message: string): void { this.showToast('success', message); }
  error(message: string): void { this.showToast('error', message); }
  warning(message: string): void { this.showToast('warning', message); }
  info(message: string): void { this.showToast('info', message); }

  remove(id: number): void {
    this.toastSubject.next({ id, type: 'info', message: '' });
  }

  // =============================================
  // UTILITAIRES D'AFFICHAGE
  // =============================================

  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      'SUCCESS': 'check_circle',
      'INFO': 'info',
      'WARNING': 'warning',
      'ERROR': 'error'
    };
    return icons[type] || 'notifications';
  }

  getColorForType(type: string): string {
    const colors: Record<string, string> = {
      'SUCCESS': 'success',
      'INFO': 'primary',
      'WARNING': 'warning',
      'ERROR': 'danger'
    };
    return colors[type] || 'primary';
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'LOW': 'Basse',
      'NORMAL': 'Normale',
      'HIGH': 'Haute',
      'URGENT': 'Urgente'
    };
    return labels[priority] || priority;
  }

  getEventLabel(event: string): string {
    const labels: Record<string, string> = {
      // Employés
      'EMPLOYEE_CREATED': 'Creation employe',
      'EMPLOYEE_UPDATED': 'Modification employe',
      'EMPLOYEE_SUSPENDED': 'Suspension employe',
      'EMPLOYEE_REACTIVATED': 'Reactivation employe',
      // Documents
      'DOCUMENT_UPLOADED': 'Document telecharge',
      'PAYSLIP_UPLOADED': 'Bulletin de paie telecharge',
      // Entreprises
      'COMPANY_CREATED': 'Creation entreprise',
      'COMPANY_UPDATED': 'Modification entreprise',
      'COMPANY_DELETED': 'Suppression entreprise',
      // Départements
      'DEPARTMENT_CREATED': 'Creation departement',
      'DEPARTMENT_UPDATED': 'Modification departement',
      'DEPARTMENT_DELETED': 'Suppression departement',
      // Postes
      'POSITION_CREATED': 'Creation poste',
      'POSITION_UPDATED': 'Modification poste',
      'POSITION_DELETED': 'Suppression poste',
      // Congés
      'LEAVE_REQUESTED': 'Demande de conge',
      'LEAVE_APPROVED': 'Conge approuve',
      'LEAVE_REJECTED': 'Conge refuse',
      'LEAVE_CANCELLED': 'Conge annule',
      'LEAVE_BALANCE_GLOBAL_UPDATED': 'Mise a jour globale des soldes',
      'LEAVE_BALANCE_INDIVIDUAL_UPDATED': 'Mise a jour individuelle du solde',
      // Rôles et permissions
      'ROLE_CREATED': 'Creation role',
      'ROLE_UPDATED': 'Modification role',
      'ROLE_DELETED': 'Suppression role',
      'PERMISSION_UPDATED': 'Mise a jour permissions',
      // Contrats (NOUVEAU)
      'CONTRACT_CREATED': 'Creation contrat',
      'CONTRACT_UPDATED': 'Modification contrat',
      'CONTRACT_RENEWED': 'Renouvellement contrat',
      'CONTRACT_EXPIRED': 'Contrat expire',
      'CONTRACT_RESILIATED': 'Contrat resilie',
      'CONTRACT_ARCHIVED': 'Contrat archive',
      'CONTRACT_EXTENDED': 'Prolongation contrat',
      'CONTRACT_EXPIRING_TWO_WEEKS': 'Contrat expire dans 2 semaines',
      'CONTRACT_EXPIRING_DAILY': 'Rappel quotidien expiration',
      'CONTRACT_EXPIRED_TODAY': 'Contrat expire aujourd\'hui',
      // Discipline (NOUVEAU)
      'DISCIPLINE_EXPLANATION_CREATED': 'Demande d\'explication creee',
      'DISCIPLINE_EXPLANATION_RESPONDED': 'Reponse a demande d\'explication',
      'DISCIPLINE_EXPLANATION_VALIDATED': 'Demande d\'explication validee',
      'DISCIPLINE_EXPLANATION_REJECTED': 'Demande d\'explication rejetee',
      'DISCIPLINE_SANCTION_CREATED': 'Sanction creee',
      'DISCIPLINE_SANCTION_LIFTED': 'Sanction levee',
      'DISCIPLINE_SANCTION_UPDATED': 'Sanction modifiee',
      // Performance (NOUVEAU)
      'PERFORMANCE_EVALUATION_CREATED': 'Evaluation de performance creee',
      'PERFORMANCE_EVALUATION_UPDATED': 'Evaluation de performance modifiee',
      'PERFORMANCE_EVALUATION_DELETED': 'Evaluation de performance supprimee',
      'PERFORMANCE_CRITERE_CREATED': 'Critere de performance cree',
      'PERFORMANCE_CRITERE_UPDATED': 'Critere de performance modifie',
      'PERFORMANCE_CRITERE_DELETED': 'Critere de performance supprime',
      // Système
      'SYSTEM': 'Systeme'
    };
    return labels[event] || event;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "A l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}