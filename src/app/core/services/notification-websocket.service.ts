import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AppNotification } from '../models/notification.model'; // Changement ici

@Injectable({ providedIn: 'root' })
export class NotificationWebSocketService {
  private socket?: WebSocket;
  private notificationSubject = new Subject<AppNotification>();
  public notification$ = this.notificationSubject.asObservable();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    const wsUrl = 'ws://localhost:8080/ws/notifications';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('🔌 WebSocket connecté');
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const notification: AppNotification = JSON.parse(event.data);
        this.notificationSubject.next(notification);
      } catch (error) {
        console.error('Erreur parsing WebSocket:', error);
      }
    };

    this.socket.onclose = () => {
      console.warn('🔌 WebSocket déconnecté');
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => {
        console.log(`🔄 Tentative reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }, delay);
    } else {
      console.error('❌ Échec reconnexion WebSocket');
    }
  }

  disconnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}