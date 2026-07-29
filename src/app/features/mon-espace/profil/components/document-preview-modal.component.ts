import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

export interface DocumentPreviewData {
  id: string;
  name: string;
  typeDocument: string;
  imageUrls: string[];
  dateUpload: string;
  createdAt: string;
  createdBy?: string;
}

@Component({
  selector: 'app-document-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-modal-overlay" (click)="closeModal.emit()">
      <div class="preview-modal" (click)="$event.stopPropagation()">
        <div class="preview-modal__header">
          <h3>{{ document?.name || 'Document' }}</h3>
          <button class="preview-modal__close" (click)="closeModal.emit()">✕</button>
        </div>
        <div class="preview-modal__body">
          <div class="preview-modal__info">
            <p><strong>Type:</strong> {{ document?.typeDocument || 'Non spécifié' }}</p>
            <p><strong>Date:</strong> {{ formatDate(document?.dateUpload || document?.createdAt) }}</p>
            @if (document?.createdBy) {
              <p><strong>Ajouté par:</strong> {{ document?.createdBy }}</p>
            }
            <p><strong>Fichiers:</strong> {{ document?.imageUrls?.length || 0 }}</p>
          </div>
          
          @if (document?.imageUrls && document?.imageUrls.length > 0) {
            <!-- Affichage en grand des images -->
            <div class="preview-modal__gallery">
              <!-- Navigation si plusieurs images -->
              @if (document.imageUrls.length > 1) {
                <div class="preview-modal__nav">
                  <button class="nav-btn" (click)="previousImage()" [disabled]="currentIndex === 0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <span class="nav-counter">{{ currentIndex + 1 }} / {{ document.imageUrls.length }}</span>
                  <button class="nav-btn" (click)="nextImage()" [disabled]="currentIndex === document.imageUrls.length - 1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              }
              
              <!-- Image principale -->
              <div class="preview-modal__image-container">
                <img 
                  [src]="getPreviewUrlWithToken(document.id)" 
                  [alt]="document?.name + ' ' + (currentIndex + 1)" 
                  (error)="onImageError($event)"
                  loading="lazy"
                  class="preview-image"
                />
                <button class="download-btn" (click)="downloadCurrent()" title="Télécharger cette image">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </div>
              
              <!-- Miniatures en bas -->
              @if (document.imageUrls.length > 1) {
                <div class="preview-modal__thumbnails">
                  @for (url of document.imageUrls; track url; let i = $index) {
                    <div class="thumbnail" [class.thumbnail--active]="i === currentIndex" (click)="goToImage(i)">
                      <img [src]="getPreviewUrlWithToken(document.id)" [alt]="'Miniature ' + (i + 1)" (error)="onImageError($event)" loading="lazy"/>
                    </div>
                  }
                </div>
              }
            </div>
            
            <div class="preview-modal__actions">
              <button class="btn btn--secondary" (click)="closeModal.emit()">Fermer</button>
             
            </div>
          } @else {
            <div class="preview-modal__empty">
              <p>Aucune image disponible pour ce document.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      backdrop-filter: blur(6px);
    }
    .preview-modal {
      background: white;
      border-radius: 24px;
      max-width: 92vw !important;
      max-height: 94vh !important;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .preview-modal__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #0d9488;
      color: white;
      flex-shrink: 0;
      border-bottom: none;
    }
    .preview-modal__header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: white;
    }
    .preview-modal__close {
      background: rgba(255,255,255,0.15);
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .preview-modal__close:hover {
      background: rgba(255,255,255,0.3);
    }
    .preview-modal__body {
      padding: 16px 24px;
      overflow-y: auto;
      flex: 1;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
    }
    .preview-modal__info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      flex-shrink: 0;
    }
    .preview-modal__info p {
      margin: 4px 0;
      font-size: 14px;
      color: #374151;
    }
    .preview-modal__info p strong {
      color: #6b7280;
      font-weight: 500;
    }
    .preview-modal__gallery {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }
    .preview-modal__nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 8px 0;
      flex-shrink: 0;
    }
    .nav-btn {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .nav-btn:hover:not(:disabled) {
      background: #0d9488;
      border-color: #0d9488;
      color: white;
    }
    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .nav-counter {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    .preview-modal__image-container {
      flex: 1;
      position: relative;
      background: #f3f4f6;
      border-radius: 12px;
      overflow: hidden;
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-image {
      width: 100%;
      height: 100%;
      max-height: 65vh;
      object-fit: contain;
      background: white;
      border-radius: 12px;
    }
    .download-btn {
      position: absolute;
      bottom: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.7);
      border: none;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      transition: all 0.2s;
    }
    .download-btn:hover {
      background: #0d9488;
      transform: scale(1.1);
    }
    .preview-modal__thumbnails {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 8px 0;
      flex-shrink: 0;
    }
    .thumbnail {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.2s;
      flex-shrink: 0;
    }
    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .thumbnail--active {
      border-color: #0d9488;
    }
    .thumbnail:hover {
      border-color: #0d9488;
    }
    .preview-modal__actions {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      flex-shrink: 0;
      background: white;
      margin-left: -24px;
      margin-right: -24px;
      padding-left: 24px;
      padding-right: 24px;
      border-radius: 0 0 24px 24px;
    }
    .btn {
      padding: 10px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn--primary {
      background: #0d9488;
      color: white;
    }
    .btn--primary:hover {
      background: #0f766e;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
    }
    .btn--secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .btn--secondary:hover {
      background: #d1d5db;
    }
    .preview-modal__empty {
      text-align: center;
      padding: 80px 20px;
      color: #6b7280;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .preview-modal__empty h4 {
      margin: 0 0 8px;
      color: #374151;
    }
    .preview-modal__empty p {
      margin: 0;
      font-size: 14px;
    }

    /* RESPONSIVE */
    @media (max-width: 640px) {
      .preview-modal {
        max-width: 98vw !important;
        max-height: 98vh !important;
        border-radius: 16px;
      }
      .preview-modal__header {
        padding: 12px 16px;
      }
      .preview-modal__header h3 {
        font-size: 15px;
      }
      .preview-modal__body {
        padding: 12px 16px;
      }
      .preview-modal__info {
        grid-template-columns: 1fr;
        padding: 12px;
      }
      .preview-image {
        max-height: 50vh;
      }
      .preview-modal__actions {
        flex-direction: column;
        gap: 8px;
        margin: 0 -16px;
        padding: 12px 16px;
        border-radius: 0 0 16px 16px;
      }
      .preview-modal__actions .btn {
        width: 100%;
        justify-content: center;
      }
      .thumbnail {
        width: 48px;
        height: 48px;
      }
      .nav-btn {
        width: 32px;
        height: 32px;
      }
    }
  `]
})
export class DocumentPreviewModalComponent implements OnInit, OnChanges {
  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'access_token';

  @Input() isOpen = false;
  @Input() document: DocumentPreviewData | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() downloadDocument = new EventEmitter<{ documentId: string; url: string; name: string }>();
  @Output() downloadAllDocuments = new EventEmitter<{ documentId: string; urls: string[]; name: string }>();

  currentIndex = 0;

  ngOnInit(): void {
    console.log('📄 DocumentPreviewModal initialized with document:', this.document);
    this.debugToken();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document']) {
      console.log('📄 Document changed:', this.document);
      this.currentIndex = 0; // Reset index when document changes
    }
    if (changes['isOpen'] && this.isOpen) {
      console.log('📄 Modal opened with document:', this.document);
      this.debugToken();
    }
  }

  private debugToken(): void {
    const token = localStorage.getItem(this.TOKEN_KEY) || localStorage.getItem('token');
    console.log('🔑 Token présent dans localStorage:', token ? 'Oui' : 'Non');
    if (token) {
      console.log('🔑 Token (début):', token.substring(0, 30) + '...');
    } else {
      console.warn('⚠️ Aucun token trouvé!');
      console.log('📋 Toutes les clés localStorage:', Object.keys(localStorage));
    }
  }

  private getToken(): string | null {
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      token = localStorage.getItem('token');
    }
    return token;
  }

  getPreviewUrlWithToken(documentId: string): string {
    if (!documentId) return '';
    const token = this.getToken();
    const baseUrl = `${this.apiUrl}/documents-management/pieces/${documentId}/preview`;
    if (token) {
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    }
    return baseUrl;
  }

  getPreviewUrl(documentId: string): string {
    if (!documentId) return '';
    return `${this.apiUrl}/documents-management/pieces/${documentId}/preview`;
  }

  getDownloadUrlWithToken(documentId: string): string {
    if (!documentId) return '';
    const token = this.getToken();
    const baseUrl = `${this.apiUrl}/documents-management/pieces/${documentId}/file`;
    if (token) {
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    }
    return baseUrl;
  }

  getDownloadUrl(documentId: string): string {
    if (!documentId) return '';
    return `${this.apiUrl}/documents-management/pieces/${documentId}/file`;
  }

  formatDate(dateStr: any): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return '—';
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Cline x1="3" y1="15" x2="21" y2="15"/%3E%3Cline x1="3" y1="9" x2="21" y2="9"/%3E%3C/svg%3E';
    img.style.objectFit = 'contain';
    img.style.padding = '8px';
    img.style.background = '#f3f4f6';
  }

  // Navigation
  previousImage(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  nextImage(): void {
    if (this.document && this.currentIndex < this.document.imageUrls.length - 1) {
      this.currentIndex++;
    }
  }

  goToImage(index: number): void {
    if (this.document && index >= 0 && index < this.document.imageUrls.length) {
      this.currentIndex = index;
    }
  }

  downloadCurrent(): void {
    if (this.document && this.document.imageUrls && this.document.imageUrls.length > 0) {
      const url = this.document.imageUrls[this.currentIndex];
      const name = this.document.name + '_' + (this.currentIndex + 1);
      this.downloadSingle(url, name);
    }
  }

  downloadSingle(url: string, name: string): void {
    if (this.document) {
      console.log('📥 Downloading single file:', name);
      this.downloadDocument.emit({
        documentId: this.document.id,
        url: url,
        name: name || this.document.name || 'document'
      });
    }
  }

  downloadAll(): void {
    if (this.document && this.document.imageUrls && this.document.imageUrls.length > 0) {
      console.log('📥 Downloading all files for document:', this.document.name);
      this.downloadAllDocuments.emit({
        documentId: this.document.id,
        urls: this.document.imageUrls,
        name: this.document.name || 'documents'
      });
    }
  }
}