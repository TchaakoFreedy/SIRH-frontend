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

  // ========== Compteur de non lues ==========
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // ========== Système de Toast ==========
  private toastSubject = new Subject<ToastMessage>();
  public toast$ = this.toastSubject.asObservable();
  public notifications$ = this.toast$; // alias pour compatibilité

  private toastIdCounter = 0;
  private pollingSubscription: Subscription | null = null;

  constructor(private http: HttpClient) {}

  // =============================================
  // API NOTIFICATIONS
  // =============================================

  /**
   * Récupère les notifications avec filtres et pagination
   */
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

  /**
   * Récupère le nombre de notifications non lues
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread-count`);
  }

  /**
   * Récupère uniquement les notifications non lues
   */
  getUnreadNotifications(page: number = 0, size: number = 20): Observable<NotificationPageResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<NotificationPageResponse>(`${this.apiUrl}/unread`, { params });
  }

  /**
   * Récupère l'historique des notifications (avec filtres)
   */
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

  /**
   * Marque une notification comme lue
   */
  markAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
  }

  /**
   * Supprime une notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`);
  }

  /**
   * Supprime toutes les notifications
   */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }

  // =============================================
  // POLLING (mise à jour automatique du compteur)
  // =============================================

  /**
   * Démarre le polling pour rafraîchir le compteur de non lues
   * @param intervalMs intervalle en millisecondes (défaut : 60 secondes)
   */
  startPolling(intervalMs: number = 60000): void {
    if (this.pollingSubscription) this.stopPolling();
    this.pollingSubscription = interval(intervalMs).pipe(
      switchMap(() => this.getUnreadCount())
    ).subscribe({
      next: (count) => this.unreadCountSubject.next(count),
      error: (err) => console.error('Erreur polling notifications:', err)
    });
  }

  /**
   * Arrête le polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Rafraîchit manuellement le compteur de non lues
   */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (count) => this.unreadCountSubject.next(count),
      error: (err) => console.error('Erreur refresh unread count:', err)
    });
  }

  // =============================================
  // TOAST (messages de notification à l'écran)
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

  /**
   * Supprime un toast (appelé automatiquement après 5s ou manuellement)
   */
  remove(id: number): void {
    this.toastSubject.next({ id, type: 'info', message: '' });
  }

  // =============================================
  // UTILITAIRES D'AFFICHAGE (pour le template)
  // =============================================

  /**
   * Retourne l'icône Material Symbols correspondant au type
   */
  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      'SUCCESS': 'check_circle',
      'INFO': 'info',
      'WARNING': 'warning',
      'ERROR': 'error'
    };
    return icons[type] || 'notifications';
  }

  /**
   * Retourne la classe CSS de couleur pour le type
   */
  getColorForType(type: string): string {
    const colors: Record<string, string> = {
      'SUCCESS': 'success',   // → icon-success
      'INFO': 'primary',      // → icon-primary
      'WARNING': 'warning',   // → icon-warning
      'ERROR': 'danger'       // → icon-danger
    };
    return colors[type] || 'primary';
  }

  /**
   * Retourne le libellé en français de la priorité
   */
  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'LOW': 'Basse',
      'NORMAL': 'Normale',
      'HIGH': 'Haute',
      'URGENT': 'Urgente'
    };
    return labels[priority] || priority;
  }

  /**
   * Retourne le libellé en français de l'événement
   */
  getEventLabel(event: string): string {
    const labels: Record<string, string> = {
      'EMPLOYEE_CREATED': 'Création employé',
      'EMPLOYEE_UPDATED': 'Modification employé',
      'EMPLOYEE_SUSPENDED': 'Suspension employé',
      'DOCUMENT_UPLOADED': 'Document téléchargé',
      'COMPANY_CREATED': 'Création entreprise',
      'COMPANY_UPDATED': 'Modification entreprise',
      'COMPANY_DELETED': 'Suppression entreprise',
      'DEPARTMENT_CREATED': 'Création département',
      'DEPARTMENT_UPDATED': 'Modification département',
      'DEPARTMENT_DELETED': 'Suppression département',
      'POSITION_CREATED': 'Création poste',
      'POSITION_UPDATED': 'Modification poste',
      'POSITION_DELETED': 'Suppression poste',
      'LEAVE_REQUESTED': 'Demande de congé',
      'LEAVE_APPROVED': 'Congé approuvé',
      'LEAVE_REJECTED': 'Congé refusé',
      'LEAVE_CANCELLED': 'Congé annulé',
      'LEAVE_BALANCE_GLOBAL_UPDATED': 'Mise à jour globale des soldes',
      'LEAVE_BALANCE_INDIVIDUAL_UPDATED': 'Mise à jour individuelle du solde',
      'ROLE_CREATED': 'Création rôle',
      'ROLE_UPDATED': 'Modification rôle',
      'ROLE_DELETED': 'Suppression rôle',
      'PERMISSION_UPDATED': 'Mise à jour permissions',
      'SYSTEM': 'Système'
    };
    return labels[event] || event;
  }

  /**
   * Formate une date en texte relatif (il y a X min, etc.)
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}