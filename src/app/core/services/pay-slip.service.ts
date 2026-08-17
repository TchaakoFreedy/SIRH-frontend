// src/app/core/services/pay-slip.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap, catchError, timeout, TimeoutError, shareReplay, of } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PaySlip, PaySlipUploadResponse } from '../models/pay-slip.model';

@Injectable({
  providedIn: 'root'
})
export class PaySlipService {
  private apiUrl = `${environment.apiUrl}/pay-slips`;
  private debug = false;
  private activeUploads = new Map<string, Observable<PaySlipUploadResponse>>();
  private uploadStates = new Map<string, boolean>();

  constructor(private http: HttpClient) {
    console.log(`PaySlipService initialized with URL: ${this.apiUrl}`);
  }

  private log(...args: any[]): void {
    if (this.debug) console.log(...args);
  }

  getBaseUrl(): string {
    return environment.apiUrl.replace('/api', '');
  }

  upload(file: File, idempotencyKey: string): Observable<PaySlipUploadResponse> {
    const uploadKey = this.getUploadKey(file);
    const requestId = crypto.randomUUID();

    if (this.uploadStates.get(uploadKey)) {
      this.log('Upload already in progress');
      return throwError(() => ({
        status: 409,
        message: 'Upload deja en cours pour ce fichier',
        error: 'DUPLICATE_REQUEST'
      }));
    }

    this.uploadStates.set(uploadKey, true);

    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders()
      .set('Idempotency-Key', idempotencyKey)
      .set('X-Request-ID', requestId);

    const uploadUrl = `${this.apiUrl}/upload`;

    const upload$ = this.http.post<PaySlipUploadResponse>(uploadUrl, formData, { headers }).pipe(
      timeout(600000),
      tap({
        next: (res) => {
          this.log('Upload successful:', res);
          this.uploadStates.delete(uploadKey);
        },
        error: (error) => {
          this.log('Upload error:', error);
          this.uploadStates.delete(uploadKey);
        },
        finalize: () => {
          this.uploadStates.delete(uploadKey);
        }
      }),
      catchError((error) => {
        this.uploadStates.delete(uploadKey);
        return this.handleError(error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.activeUploads.set(uploadKey, upload$);
    return upload$;
  }

  private getUploadKey(file: File): string {
    return `${file.name}-${file.size}`;
  }

  getAll(): Observable<PaySlip[]> {
    return this.http.get<PaySlip[]>(this.apiUrl).pipe(
      timeout(30000),
      tap(data => this.log(`${data.length} pay slips received`)),
      catchError(this.handleError.bind(this))
    );
  }

  getMySlips(): Observable<PaySlip[]> {
    const url = `${this.apiUrl}/me`;
    return this.http.get<PaySlip[]>(url).pipe(
      timeout(30000),
      tap(data => this.log(`${data.length} personal pay slips received`)),
      catchError(this.handleError.bind(this))
    );
  }

  getById(id: string): Observable<PaySlip> {
    if (!id || id.trim() === '') {
      return throwError(() => new Error('Invalid pay slip ID'));
    }
    const url = `${this.apiUrl}/${id.trim()}`;
    return this.http.get<PaySlip>(url).pipe(
      timeout(30000),
      tap(data => this.log('Pay slip received:', data)),
      catchError(this.handleError.bind(this))
    );
  }

  update(id: string, data: Partial<PaySlip>): Observable<PaySlip> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<PaySlip>(url, data).pipe(
      timeout(30000),
      tap(res => this.log('Pay slip updated:', res)),
      catchError(this.handleError.bind(this))
    );
  }

  delete(id: string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url).pipe(
      timeout(30000),
      tap(() => this.log('Pay slip deleted')),
      catchError(this.handleError.bind(this))
    );
  }

  downloadPdf(id: string): void {
    if (!id) return;
    
    const url = `${this.apiUrl}/${id}/download`;
    
    this.http.get(url, {
      responseType: 'blob',
      headers: new HttpHeaders().set('Accept', 'application/pdf')
    }).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bulletin-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      },
      error: (error) => {
        console.error('Erreur lors du telechargement du PDF:', error);
        window.open(url, '_blank');
      }
    });
  }

  getPageIds(id: string): Observable<string[]> {
    const url = `${this.apiUrl}/${id}/pages`;
    return this.http.get<string[]>(url).pipe(
      timeout(30000),
      tap(ids => this.log(`${ids.length} pages found`)),
      catchError(this.handleError.bind(this))
    );
  }

  downloadPage(id: string, pageNumber: number): void {
    const url = `${this.apiUrl}/${id}/download/page/${pageNumber}`;
    
    this.http.get(url, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `page-${pageNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      },
      error: (error) => {
        console.error('Erreur lors du telechargement de la page:', error);
        window.open(url, '_blank');
      }
    });
  }

  getImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}${imageUrl}`;
  }

  getImageWithAuth(imageUrl: string, retries: number = 3): Observable<Blob> {
    const fullUrl = this.getImageUrl(imageUrl);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('access_token')}`);
    
    return this.http.get(fullUrl, { 
      headers, 
      responseType: 'blob', 
      observe: 'body' 
    }).pipe(
      timeout(30000),
      retry(retries),
      tap(() => this.log('Image retrieved with auth')),
      catchError((error) => {
        console.error(`Error retrieving image:`, error);
        return throwError(() => error);
      })
    );
  }

  viewImage(imageUrl: string): void {
    const fullUrl = this.getImageUrl(imageUrl);
    window.open(fullUrl, '_blank');
  }

  getImageBlob(imageUrl: string): Observable<Blob> {
    const fullUrl = this.getImageUrl(imageUrl);
    return this.http.get(fullUrl, { 
      responseType: 'blob',
      observe: 'body'
    }).pipe(
      timeout(30000),
      tap(() => this.log('Image blob retrieved')),
      catchError(this.handleError.bind(this))
    );
  }

  private handleError(error: HttpErrorResponse | TimeoutError): Observable<never> {
    let userMessage = 'Server error';

    if (error instanceof TimeoutError) {
      userMessage = 'Request timed out. Please try again.';
      return throwError(() => ({ 
        status: 408, 
        message: userMessage,
        error: 'TIMEOUT'
      }));
    }

    const httpError = error as HttpErrorResponse;

    console.error('Detailed HTTP error:', {
      status: httpError.status,
      statusText: httpError.statusText,
      message: httpError.message,
      error: httpError.error,
      url: httpError.url
    });

    if (httpError.error instanceof ErrorEvent) {
      userMessage = `Network error: ${httpError.error.message}`;
    } else {
      switch (httpError.status) {
        case 0:
          userMessage = 'Server not responding. Check your connection.';
          break;
        case 400:
          userMessage = 'Invalid request. Please check your data.';
          break;
        case 401:
          userMessage = 'Not authenticated. Please login again.';
          break;
        case 403:
          userMessage = 'Access denied. You do not have the necessary permissions.';
          break;
        case 404:
          userMessage = 'Pay slip not found.';
          break;
        case 408:
          userMessage = 'Request timed out. Please try again.';
          break;
        case 409:
          userMessage = 'Upload already in progress for this file.';
          break;
        case 413:
          userMessage = 'File too large (max 10MB).';
          break;
        case 500:
          userMessage = 'Internal server error. Please try again later.';
          break;
        case 503:
          userMessage = 'Service unavailable. Please try again later.';
          break;
        default:
          userMessage = `Error ${httpError.status}: ${httpError.message}`;
      }
    }

    return throwError(() => ({
      status: httpError.status,
      message: userMessage,
      originalError: httpError,
      error: httpError.error
    }));
  }

  getStatusColor(status?: string): string {
    if (!status) return 'secondary';
    const map: Record<string, string> = {
      'PROCESSING': 'info',
      'SUCCESS': 'success',
      'PARTIAL_SUCCESS': 'warning',
      'FAILED': 'danger',
      'EMPLOYEE_NOT_FOUND': 'danger',
      'OCR_ERROR': 'warning',
      'INVALID_DOCUMENT': 'danger'
    };
    return map[status] || 'secondary';
  }

  getStatusLabel(status?: string): string {
    if (!status) return 'Unknown';
    const map: Record<string, string> = {
      'PROCESSING': 'Processing',
      'SUCCESS': 'Success',
      'PARTIAL_SUCCESS': 'Partial Success',
      'FAILED': 'Failed',
      'EMPLOYEE_NOT_FOUND': 'Employee Not Found',
      'OCR_ERROR': 'OCR Error',
      'INVALID_DOCUMENT': 'Invalid Document'
    };
    return map[status] || status;
  }

  isUploadInProgress(fileName: string, fileSize: number): boolean {
    const key = `${fileName}-${fileSize}`;
    return this.uploadStates.has(key) || this.activeUploads.has(key);
  }

  cancelUpload(fileName: string, fileSize: number): void {
    const key = `${fileName}-${fileSize}`;
    this.activeUploads.delete(key);
    this.uploadStates.delete(key);
  }
}