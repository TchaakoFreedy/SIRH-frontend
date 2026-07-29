import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Document {
  id: string;
  name: string;
  typeDocument: string;
  imageUrls: string[];
  dateUpload: string;
  createdAt: string;
  createdBy?: string;
  employee?: any;
  contrat?: any;
}

export interface DocumentUrlResponse {
  id: string;
  name: string;
  type: string;
  urls: string[];
  uploadDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ================================================
  // 📄 RÉCUPÉRATION DES DOCUMENTS
  // ================================================

  /**
   * Récupère les documents d'un employé via l'endpoint unifié (DocumentController).
   * Ajoute un cache-buster pour éviter la mise en cache.
   */
  getByEmployee(employeeId: string): Observable<Document[]> {
    console.log('📄 [DocumentService] Récupération des documents pour employé:', employeeId);
    const cacheBuster = `_t=${new Date().getTime()}`;
    const url = `${this.apiUrl}/documents-management/pieces/employe/${employeeId}?${cacheBuster}`;
    console.log('📄 [DocumentService] URL appelée:', url);
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
    
    return this.http.get<any[]>(url, { headers }).pipe(
      tap(response => {
        console.log('✅ [DocumentService] Réponse brute:', response);
        console.log('✅ [DocumentService] Nombre d\'éléments:', response?.length || 0);
      }),
      map(response => {
        if (!response) return [];
        if (!Array.isArray(response)) return [response];
        return response.map(doc => ({
          ...doc,
          id: doc.id || doc._id,
          imageUrls: doc.imageUrls || []
        }));
      }),
      tap(documents => {
        console.log('📄 [DocumentService] Documents traités:', documents?.length || 0);
        if (documents && documents.length > 0) {
          console.log('📄 Premier document:', documents[0]);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ [DocumentService] Erreur HTTP:', error);
        return of([]);
      })
    );
  }

  /**
   * Méthode de secours : utilise l'endpoint /employees/{id}/documents
   * (si l'endpoint principal venait à échouer)
   */
  getByEmployeeAlt(employeeId: string): Observable<Document[]> {
    console.log('📄 [DocumentService] (Fallback) Récupération via employees endpoint:', employeeId);
    const url = `${this.apiUrl}/employees/${employeeId}/documents`;
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    return this.http.get<any[]>(url, { headers }).pipe(
      map(response => {
        if (!response || !Array.isArray(response)) return [];
        return response.map(doc => ({
          ...doc,
          id: doc.id || doc._id,
          imageUrls: doc.imageUrls || []
        }));
      }),
      catchError((error) => {
        console.error('❌ [DocumentService] Fallback échoué:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupère les URLs des documents (pour affichage)
   */
  getDocumentUrlsByEmployee(employeeId: string): Observable<DocumentUrlResponse[]> {
    console.log('📄 [DocumentService] Récupération des URLs pour employé:', employeeId);
    const url = `${this.apiUrl}/documents-management/pieces/employe/${employeeId}/urls`;
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    return this.http.get<DocumentUrlResponse[]>(url, { headers }).pipe(
      tap(response => console.log('✅ [DocumentService] URLs récupérées:', response?.length || 0)),
      catchError((error) => {
        console.error('❌ [DocumentService] Erreur récupération URLs:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère un document par son ID
   */
  getDocumentById(documentId: string): Observable<Document> {
    const url = `${this.apiUrl}/documents-management/pieces/${documentId}`;
    console.log('📄 [DocumentService] Récupération document ID:', documentId);
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    return this.http.get<Document>(url, { headers }).pipe(
      catchError((error) => {
        console.error('❌ [DocumentService] Erreur getDocumentById:', error);
        return throwError(() => error);
      })
    );
  }

  // ================================================
  // 📤 UPLOAD DE DOCUMENTS
  // ================================================

  /**
   * Upload de documents pour un employé
   */
  uploadPiecesEmploye(employeeId: string, formData: FormData): Observable<any> {
    console.log('📤 [DocumentService] Upload pour employé:', employeeId);
    const url = `${this.apiUrl}/documents-management/pieces/employe/${employeeId}`;
    console.log('📤 [DocumentService] URL upload:', url);
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    return this.http.post(url, formData, { headers }).pipe(
      tap(response => console.log('✅ [DocumentService] Upload réussi:', response)),
      catchError((error) => {
        console.error('❌ [DocumentService] Erreur upload:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Upload de documents pour un contrat
   */
  uploadContractDocument(contractId: string, formData: FormData): Observable<any> {
    console.log('📤 [DocumentService] Upload pour contrat:', contractId);
    const url = `${this.apiUrl}/documents-management/pieces/contrat/${contractId}`;
    console.log('📤 [DocumentService] URL upload contrat:', url);
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    return this.http.post(url, formData, { headers }).pipe(
      tap(response => console.log('✅ [DocumentService] Upload contrat réussi:', response)),
      catchError((error) => {
        console.error('❌ [DocumentService] Erreur upload contrat:', error);
        return throwError(() => error);
      })
    );
  }

  // ================================================
  // 🗑️ SUPPRESSION
  // ================================================

  /**
   * Supprime un document par son ID
   */
  delete(id: string): Observable<any> {
    console.log('🗑️ [DocumentService] Suppression document:', id);
    const url = `${this.apiUrl}/documents-management/pieces/${id}`;
    console.log('🗑️ [DocumentService] URL suppression:', url);
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    return this.http.delete(url, { headers }).pipe(
      tap(() => console.log('✅ [DocumentService] Document supprimé')),
      catchError((error) => {
        console.error('❌ [DocumentService] Erreur suppression:', error);
        return throwError(() => error);
      })
    );
  }

  // ================================================
  // 📥 TÉLÉCHARGEMENT
  // ================================================

  /**
   * Télécharge un fichier via l'endpoint /file (retourne un Blob)
   */
  downloadDocumentFile(documentId: string, fileName?: string): Observable<Blob> {
    console.log('📥 [DocumentService] Téléchargement document:', documentId);
    const url = `${this.apiUrl}/documents-management/pieces/${documentId}/file`;
    console.log('📥 [DocumentService] URL téléchargement:', url);
    
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Accept': 'application/octet-stream'
    });
    
    return this.http.get(url, {
      headers: headers,
      responseType: 'blob'
    }).pipe(
      catchError((error) => {
        console.error('❌ [DocumentService] Erreur téléchargement:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Télécharge et sauvegarde un fichier directement dans le navigateur
   */
  downloadDocumentFileAndSave(documentId: string, fileName?: string): void {
    console.log('📥 [DocumentService] Téléchargement et sauvegarde:', documentId);
    
    this.downloadDocumentFile(documentId, fileName).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        console.log('✅ [DocumentService] Téléchargement réussi');
      },
      error: (err) => {
        console.error('❌ [DocumentService] Erreur téléchargement:', err);
        // Fallback : ouvrir dans un nouvel onglet avec le token
        const token = this.getToken();
        const fallbackUrl = `${this.apiUrl}/documents-management/pieces/${documentId}/file?token=${token}`;
        window.open(fallbackUrl, '_blank');
      }
    });
  }

  /**
   * Méthode simple pour télécharger depuis une URL
   * (utilisée pour les contrats ou autres URLs absolues)
   */
  downloadDocument(url: string, fileName?: string): void {
    console.log('📥 [DocumentService] Téléchargement depuis URL:', url);
    if (!url) {
      console.warn('⚠️ [DocumentService] URL vide');
      return;
    }
    window.open(url, '_blank');
  }

  /**
   * Télécharge plusieurs documents avec un délai entre chaque
   */
  async downloadMultipleDocuments(urls: string[], baseFileName: string): Promise<void> {
    if (!urls || urls.length === 0) return;
    for (let i = 0; i < urls.length; i++) {
      setTimeout(() => {
        const fileName = `${baseFileName}_${i + 1}`;
        this.downloadDocument(urls[i], fileName);
      }, i * 500);
    }
  }

  // ================================================
  // 🛠 UTILITAIRES
  // ================================================

  /**
   * Récupère le token JWT depuis le localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('token') || localStorage.getItem('access_token');
  }

  /**
   * Extrait le nom d'un fichier à partir d'une URL
   * (utilisé en fallback)
   */
  private getFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/');
      return segments[segments.length - 1] || 'document';
    } catch {
      return 'document';
    }
  }

  // Méthodes obsolètes conservées pour compatibilité
  getDocumentDownloadUrl(documentId: string): Observable<DocumentUrlResponse> {
    // Endpoint non utilisé, on renvoie une réponse vide
    return of({ id: documentId, name: '', type: '', urls: [], uploadDate: '' });
  }
}