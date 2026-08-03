// src/app/core/services/pay-slip.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap, catchError, timeout, TimeoutError, shareReplay } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PaySlip, PaySlipUploadResponse } from '../models/pay-slip.model';

@Injectable({
  providedIn: 'root'
})
export class PaySlipService {
  private apiUrl = `${environment.apiUrl}/pay-slips`;
  private debug = true;
  private activeUploads = new Map<string, Observable<PaySlipUploadResponse>>();

  constructor(private http: HttpClient) {
    console.log(`PaySlipService initialized with URL: ${this.apiUrl}`);
  }

  private log(...args: any[]): void {
    if (this.debug) console.log(...args);
  }

  getBaseUrl(): string {
    return environment.apiUrl.replace('/api', '');
  }

  // ========== 1. UPLOAD ==========
  upload(file: File, idempotencyKey: string): Observable<PaySlipUploadResponse> {
    const uploadKey = `${file.name}-${file.size}`;

    if (this.activeUploads.has(uploadKey)) {
      this.log('Upload already in progress, reusing');
      return this.activeUploads.get(uploadKey)!;
    }

    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders()
      .set('Idempotency-Key', idempotencyKey)
      .set('X-Request-ID', crypto.randomUUID());

    const uploadUrl = `${this.apiUrl}/upload`;

    const upload$ = this.http.post<PaySlipUploadResponse>(uploadUrl, formData, { headers }).pipe(
      timeout(600000), // 10 minutes timeout for large files
      tap(res => {
        this.log('Upload successful:', res);
        this.activeUploads.delete(uploadKey);
      }),
      catchError((error) => {
        this.activeUploads.delete(uploadKey);
        console.error('Upload error:', error);
        return this.handleError(error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.activeUploads.set(uploadKey, upload$);
    return upload$;
  }

  // ========== 2. GET ALL PAY SLIPS ==========
  getAll(): Observable<PaySlip[]> {
    return this.http.get<PaySlip[]>(this.apiUrl).pipe(
      timeout(30000),
      tap(data => this.log(`${data.length} pay slips received`)),
      catchError(this.handleError.bind(this))
    );
  }

  // ========== 3. GET MY PAY SLIPS ==========
  getMySlips(): Observable<PaySlip[]> {
    const url = `${this.apiUrl}/me`;
    return this.http.get<PaySlip[]>(url).pipe(
      timeout(30000),
      tap(data => this.log(`${data.length} personal pay slips received`)),
      catchError(this.handleError.bind(this))
    );
  }

  // ========== 4. GET BY ID ==========
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

  // ========== 5. UPDATE ==========
  update(id: string, data: Partial<PaySlip>): Observable<PaySlip> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<PaySlip>(url, data).pipe(
      timeout(30000),
      tap(res => this.log('Pay slip updated:', res)),
      catchError(this.handleError.bind(this))
    );
  }

  // ========== 6. DELETE ==========
  delete(id: string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url).pipe(
      timeout(30000),
      tap(() => this.log('Pay slip deleted')),
      catchError(this.handleError.bind(this))
    );
  }

  // ========== 7. DOWNLOAD PDF ==========
  downloadPdf(id: string): void {
    if (!id) return;
    const url = `${this.apiUrl}/${id}/download`;
    window.open(url, '_blank');
  }

  // ========== 8. GET PAGE IDS ==========
  getPageIds(id: string): Observable<string[]> {
    const url = `${this.apiUrl}/${id}/pages`;
    return this.http.get<string[]>(url).pipe(
      timeout(30000),
      tap(ids => this.log(`${ids.length} pages found`)),
      catchError(this.handleError.bind(this))
    );
  }

  // ========== 9. DOWNLOAD PAGE ==========
  downloadPage(id: string, pageNumber: number): void {
    const url = `${this.apiUrl}/${id}/download/page/${pageNumber}`;
    window.open(url, '_blank');
  }

  // ========== 10. DOWNLOAD ZIP ==========
  downloadZip(id: string): void {
    const url = `${this.apiUrl}/${id}/zip`;
    window.open(url, '_blank');
  }

  // ========== 11. GET IMAGE URL ==========
  getImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}${imageUrl}`;
  }

  // ========== 12. GET IMAGE WITH AUTH ==========
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

  // ========== 13. VIEW IMAGE ==========
  viewImage(imageUrl: string): void {
    const fullUrl = this.getImageUrl(imageUrl);
    window.open(fullUrl, '_blank');
  }

  // ========== 14. GET IMAGE BLOB ==========
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

  // ========== ERROR HANDLING ==========
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

  // ========== UTILITY METHODS ==========
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
    return this.activeUploads.has(key);
  }

  cancelUpload(fileName: string, fileSize: number): void {
    const key = `${fileName}-${fileSize}`;
    this.activeUploads.delete(key);
  }
}