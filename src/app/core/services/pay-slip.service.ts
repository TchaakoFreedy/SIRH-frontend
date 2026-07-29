import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap, catchError, timeout, TimeoutError, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaySlip, PaySlipUploadResponse } from '../models/pay-slip.model';

@Injectable({
  providedIn: 'root'
})
export class PaySlipService {
  private apiUrl = `${environment.apiUrl}/pay-slips`;
  private debug = true;
  private activeUploads = new Map<string, Observable<PaySlipUploadResponse>>();

  constructor(private http: HttpClient) {}

  private log(...args: any[]): void {
    if (this.debug) console.log(...args);
  }

  upload(file: File, idempotencyKey: string): Observable<PaySlipUploadResponse> {
    const uploadKey = `${file.name}-${file.size}`;

    if (this.activeUploads.has(uploadKey)) {
      this.log('🔄 Upload déjà en cours, réutilisation');
      return this.activeUploads.get(uploadKey)!;
    }

    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders()
      .set('Idempotency-Key', idempotencyKey)
      .set('X-Request-ID', crypto.randomUUID());

    this.log('🚀 Upload du fichier:', file.name, 'avec clé:', idempotencyKey);

    const upload$ = this.http.post<PaySlipUploadResponse>(`${this.apiUrl}/upload`, formData, {
      headers,
      withCredentials: false
    }).pipe(
      timeout(600000),
      tap(res => {
        this.log('✅ Upload réussi:', res);
        this.activeUploads.delete(uploadKey);
      }),
      catchError((error) => {
        this.activeUploads.delete(uploadKey);
        return this.handleError(error);
      }),
      // ✅ Ajouter shareReplay avec refCount: false pour garder le résultat
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.activeUploads.set(uploadKey, upload$);
    this.log(`📦 Upload enregistré avec clé: ${uploadKey}`);

    return upload$;
  }

 
  // ========== 2. RÉCUPÉRATION DE TOUS LES BULLETINS ==========
  getAll(): Observable<PaySlip[]> {
    this.log('📡 GET all bulletins:', this.apiUrl);
    return this.http.get<PaySlip[]>(this.apiUrl)
      .pipe(
        timeout(30000),
        tap(data => this.log(`📋 ${data.length} bulletins reçus`)),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ========== 3. BULLETINS DE L'UTILISATEUR CONNECTÉ ==========
  getMySlips(): Observable<PaySlip[]> {
    const url = `${this.apiUrl}/me`;
    this.log('📡 GET my bulletins:', url);
    return this.http.get<PaySlip[]>(url)
      .pipe(
        timeout(30000),
        tap(data => this.log(`📋 ${data.length} bulletins personnels reçus`)),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ========== 4. RÉCUPÉRATION D'UN BULLETIN PAR ID ==========
  getById(id: string): Observable<PaySlip> {
    if (!id || id.trim() === '') {
      const error = new Error('ID de bulletin invalide');
      this.log('❌', error.message);
      return throwError(() => error);
    }
    const url = `${this.apiUrl}/${id.trim()}`;
    this.log('📡 GET bulletin by id:', url);
    return this.http.get<PaySlip>(url)
      .pipe(
        timeout(30000),
        tap(data => this.log('📄 Bulletin reçu:', data)),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ========== 5. MISE À JOUR ==========
  update(id: string, data: Partial<PaySlip>): Observable<PaySlip> {
    this.log('📡 UPDATE bulletin:', `${this.apiUrl}/${id}`, data);
    return this.http.put<PaySlip>(`${this.apiUrl}/${id}`, data)
      .pipe(
        timeout(30000),
        tap(res => this.log('✅ Bulletin mis à jour:', res)),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ========== 6. SUPPRESSION ==========
  delete(id: string): Observable<void> {
    this.log('📡 DELETE bulletin:', `${this.apiUrl}/${id}`);
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(30000),
        tap(() => this.log('✅ Bulletin supprimé')),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ========== 7. TÉLÉCHARGER LE PDF ORIGINAL ==========
  downloadPdf(id: string): void {
    if (!id) {
      console.error('❌ ID invalide');
      return;
    }
    const url = `${this.apiUrl}/${id}/download`;
    this.log('⬇️ Téléchargement PDF:', url);
    window.open(url, '_blank');
  }
 
  // ========== 8. RÉCUPÉRER LA LISTE DES IDs DE PAGES ==========
  getPageIds(id: string): Observable<string[]> {
    this.log('📡 GET page IDs:', `${this.apiUrl}/${id}/pages`);
    return this.http.get<string[]>(`${this.apiUrl}/${id}/pages`)
      .pipe(
        timeout(30000),
        tap(ids => this.log(`🖼️ ${ids.length} pages trouvées`)),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ========== 9. TÉLÉCHARGER UNE PAGE SPÉCIFIQUE (PNG) ==========
  downloadPage(id: string, pageNumber: number): void {
    const url = `${this.apiUrl}/${id}/download/page/${pageNumber}`;
    this.log('⬇️ Téléchargement page:', url);
    window.open(url, '_blank');
  }
 
  // ========== 10. TÉLÉCHARGER TOUT LE BULLETIN EN ZIP ==========
  downloadZip(id: string): void {
    const url = `${this.apiUrl}/${id}/zip`;
    this.log('⬇️ Téléchargement ZIP:', url);
    window.open(url, '_blank');
  }
 
  // ========== 11. RÉCUPÉRER L'IMAGE DIRECTEMENT (URL) ==========
  getImageUrl(imageId: string): string {
    return `${this.apiUrl}/image/${imageId}`;
  }
 
  // ========== 12. AFFICHER L'IMAGE DANS UN NOUVEL ONGLET ==========
  viewImage(imageId: string): void {
    const url = this.getImageUrl(imageId);
    this.log('🖼️ Affichage image:', url);
    window.open(url, '_blank');
  }
 
  // ========== 13. RÉCUPÉRER L'IMAGE EN BLOB ==========
  getImageBlob(imageId: string): Observable<Blob> {
    const url = this.getImageUrl(imageId);
    return this.http.get(url, { responseType: 'blob' })
      .pipe(
        timeout(30000),
        tap(() => this.log('🖼️ Image récupérée en blob')),
        catchError(this.handleError.bind(this))
      );
  }
 
  // ================================================================
  // GESTION CENTRALISÉE DES ERREURS
  // ================================================================
  private handleError(error: HttpErrorResponse | TimeoutError): Observable<never> {
    let userMessage = 'Erreur serveur';
 
    if (error instanceof TimeoutError) {
      userMessage = '⏱️ La requête a expiré. Veuillez réessayer.';
      console.error('⏱️ Timeout error:', error);
      return throwError(() => ({
        status: 408,
        message: userMessage,
        originalError: error
      }));
    }
 
    const httpError = error as HttpErrorResponse;
 
    if (httpError.error instanceof ErrorEvent) {
      userMessage = `Erreur réseau : ${httpError.error.message}`;
    } else {
      switch (httpError.status) {
        case 0: userMessage = '🌐 Le serveur ne répond pas. Vérifiez votre connexion.'; break;
        case 400: userMessage = 'Requête invalide'; break;
        case 401: userMessage = '⛔ Non authentifié'; break;
        case 403: userMessage = '⛔ Accès interdit'; break;
        case 404: userMessage = '⚠️ Bulletin non trouvé'; break;
        case 408: userMessage = '⏱️ La requête a expiré. Veuillez réessayer.'; break;
        case 413: userMessage = '📦 Le fichier est trop volumineux.'; break;
        case 500: userMessage = '⚠️ Erreur interne du serveur'; break;
        default: userMessage = `Erreur ${httpError.status} : ${httpError.message}`;
      }
    }
 
    console.error('❌ Erreur HTTP détaillée:', {
      status: httpError.status,
      statusText: httpError.statusText,
      message: httpError.message,
      error: httpError.error
    });
 
    return throwError(() => ({
      status: httpError.status,
      message: userMessage,
      originalError: httpError
    }));
  }
}