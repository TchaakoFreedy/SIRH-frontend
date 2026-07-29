// services/user.service.ts - Updated to work with AuthService
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  initiales?: string;
  photo?: string;
  department?: string;
  fonction?: string;
}


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private searchSubject = new BehaviorSubject<string>('');

  getCurrentUserProfile(): Observable<UserProfile> {
    // Si l'utilisateur n'est pas authentifié, on force le header à gérer l'état vide.
    const authUser = this.authService.getCurrentUser();
    if (!authUser) {
      return of(null as any);
    }

    // Récupération du profil réel via l'API
    return this.http.get<UserProfile>(`${this.apiUrl}/users/me`);
  }



  emitSearch(query: string): void {
    this.searchSubject.next(query);
  }

  getSearchStream(): Observable<string> {
    return this.searchSubject.asObservable();
  }
}