import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationWebSocketService {
  private socket?: WebSocket;
  private notificationSubject = new Subject<AppNotification>();
  public notification$ = this.notificationSubject.asObservable();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const wsUrl = this.buildWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const notification: AppNotification = JSON.parse(event.data);
          console.log('WebSocket message received:', notification);
          this.notificationSubject.next(notification);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      this.socket.onclose = (event) => {
        this.isConnected = false;
        console.warn('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
        this.reconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // La fermeture sera gérée par onclose
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.reconnect();
    }
  }

  private buildWebSocketUrl(): string {
    let baseUrl = environment.apiUrl || 'http://localhost:8080';
    // Supprimer le slash final
    baseUrl = baseUrl.replace(/\/+$/, '');
    // Supprimer le préfixe /api s'il est présent (le WebSocket est sur /ws)
    baseUrl = baseUrl.replace(/\/api$/, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = baseUrl.replace(/^https?:\/\//, '');
    const url = `${protocol}://${host}/ws/notifications`;
    console.log('Built WebSocket URL:', url);
    return url;
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached. Giving up.');
    }
  }

  disconnect(): void {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close(1000, 'User disconnected');
      }
      this.socket = undefined;
      this.isConnected = false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}