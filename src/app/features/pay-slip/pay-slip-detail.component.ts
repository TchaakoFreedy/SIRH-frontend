// src/app/features/pay-slip/pay-slip-detail.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { PaySlipService } from '../../core/services/pay-slip.service';
import { AuthService } from '../../services/auth.service';
import { PaySlip } from '../../core/models/pay-slip.model';

@Component({
  selector: 'app-pay-slip-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe],
  templateUrl: './pay-slip-detail.component.html',
  styleUrls: ['./pay-slip-detail.component.css']
})
export class PaySlipDetailComponent implements OnInit, OnDestroy {
  paySlip: PaySlip | null = null;
  loading = false;
  error = '';
  canDownload = false;
  
  // Image properties
  imageUrl: string | null = null;
  imageLoaded = false;
  imageLoadError = false;
  imageLoading = false;
  imageUrlString: string | null = null;

  // Page navigation
  selectedPageIndex: number = 0;
  thumbnailErrors: boolean[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    public paySlipService: PaySlipService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const permissions = this.authService.getCurrentUser()?.permissions || [];
    this.canDownload = permissions.includes('PAYSLIP_DOWNLOAD');

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadPaySlip(id);
      } else {
        this.error = 'Missing pay slip ID.';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== LOAD PAY SLIP ==========
  loadPaySlip(id: string): void {
    if (!id || id.trim() === '') {
      this.error = 'Invalid ID.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.paySlipService.getById(id.trim())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.paySlip = data;
          console.log('Pay slip loaded:', data);
          console.log('imageUrls:', data.imageUrls);
          
          if (data.imageUrls) {
            this.thumbnailErrors = new Array(data.imageUrls.length).fill(false);
          }
          
          this.loadBulletinImage();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading pay slip:', err);
          this.error = err.message || 'Error loading pay slip';
          this.cdr.detectChanges();
        }
      });
  }

  // ========== LOAD BULLETIN IMAGE ==========
  loadBulletinImage(): void {
    if (!this.paySlip) {
      return;
    }

    let imageUrl: string | null = null;
    
    if (this.paySlip.imageUrls && this.paySlip.imageUrls.length > 0) {
      const index = this.selectedPageIndex;
      imageUrl = this.paySlip.imageUrls[index] || this.paySlip.imageUrls[0];
      console.log('Using image URL from imageUrls:', imageUrl);
    } else if (this.paySlip.pdfFileUrl) {
      console.warn('No image URLs found, using PDF URL as fallback:', this.paySlip.pdfFileUrl);
      imageUrl = this.paySlip.pdfFileUrl;
    }

    if (!imageUrl) {
      console.warn('No image URL found for this pay slip');
      this.imageLoadError = true;
      this.cdr.detectChanges();
      return;
    }

    this.imageUrlString = imageUrl;
    this.imageLoading = true;
    this.imageLoaded = false;
    this.imageLoadError = false;
    this.cdr.detectChanges();

    this.loadImageDirect();
  }

  // ========== LOAD IMAGE DIRECTLY ==========
  loadImageDirect(): void {
    if (!this.imageUrlString) {
      this.imageLoadError = true;
      this.imageLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const fullUrl = this.paySlipService.getImageUrl(this.imageUrlString);
    console.log('Full URL:', fullUrl);
    
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully');
      this.imageUrl = fullUrl;
      this.imageLoaded = true;
      this.imageLoadError = false;
      this.imageLoading = false;
      this.cdr.detectChanges();
    };
    img.onerror = (error) => {
      console.error('Image failed to load:', error);
      this.imageLoading = false;
      this.imageLoadError = true;
      this.cdr.detectChanges();
      this.loadImageWithAuth();
    };
    img.src = fullUrl;
  }

  // ========== LOAD IMAGE WITH AUTH ==========
  loadImageWithAuth(): void {
    if (!this.imageUrlString) {
      this.imageLoadError = true;
      this.imageLoading = false;
      this.cdr.detectChanges();
      return;
    }

    console.log('Loading image with authentication...');
    this.paySlipService.getImageWithAuth(this.imageUrlString)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          console.log(`Blob received: ${blob.size} bytes`);
          if (blob && blob.size > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
              this.imageUrl = e.target?.result as string;
              this.imageLoaded = true;
              this.imageLoadError = false;
              this.imageLoading = false;
              this.cdr.detectChanges();
            };
            reader.onerror = () => {
              this.imageLoading = false;
              this.imageLoadError = true;
              this.cdr.detectChanges();
            };
            reader.readAsDataURL(blob);
          } else {
            this.imageLoading = false;
            this.imageLoadError = true;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Error loading image with auth:', err);
          this.imageLoading = false;
          this.imageLoadError = true;
          this.cdr.detectChanges();
        }
      });
  }

  // ========== PAGE NAVIGATION ==========
  selectPage(index: number): void {
    this.selectedPageIndex = index;
    if (this.paySlip?.imageUrls && this.paySlip.imageUrls[index]) {
      this.imageUrlString = this.paySlip.imageUrls[index];
      this.imageUrl = null;
      this.imageLoaded = false;
      this.imageLoadError = false;
      this.imageLoading = true;
      this.cdr.detectChanges();
      this.loadImageDirect();
    }
  }

  getImageUrl(imageUrl: string): string {
    return this.paySlipService.getImageUrl(imageUrl);
  }

  downloadPage(pageNumber: number): void {
    if (this.paySlip) {
      this.paySlipService.downloadPage(this.paySlip.id, pageNumber);
    }
  }

  onThumbnailError(index: number): void {
    console.warn(`Thumbnail ${index} failed to load`);
    this.thumbnailErrors[index] = true;
    this.cdr.detectChanges();
  }

  // ========== IMAGE EVENT HANDLERS ==========
  onImageLoaded(): void {
    console.log('Image displayed successfully');
    this.imageLoaded = true;
    this.imageLoadError = false;
    this.cdr.detectChanges();
  }

  onImageError(): void {
    console.warn('Image display error');
    if (this.imageLoaded) {
      return;
    }
    this.imageLoadError = true;
    this.cdr.detectChanges();
  }

  reloadImage(): void {
    console.log('Reloading pay slip image');
    this.imageUrl = null;
    this.imageLoaded = false;
    this.imageLoadError = false;
    this.loadBulletinImage();
  }

  testImageDisplay(): void {
    console.log('Test: Reloading pay slip image');
    this.reloadImage();
  }

  // ========== DOWNLOAD METHODS ==========
  downloadPdf(): void {
    if (this.paySlip) {
      this.paySlipService.downloadPdf(this.paySlip.id);
    }
  }

  // ========== UTILITY METHODS ==========
  getPageCount(): number {
    if (this.paySlip?.imageUrls) {
      return this.paySlip.imageUrls.length;
    }
    return 0;
  }

  hasMultiplePages(): boolean {
    return this.getPageCount() > 1;
  }

  getStatusBadgeClass(status?: string): string {
    if (!status) return 'badge-secondary';
    switch (status) {
      case 'SUCCESS': return 'badge-success';
      case 'PARTIAL_SUCCESS': return 'badge-warning';
      case 'FAILED': return 'badge-danger';
      case 'EMPLOYEE_NOT_FOUND': return 'badge-danger';
      case 'OCR_ERROR': return 'badge-warning';
      case 'INVALID_DOCUMENT': return 'badge-danger';
      case 'PROCESSING': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status?: string): string {
    if (!status) return 'Unknown';
    const map: Record<string, string> = {
      'PROCESSING': 'Processing',
      'SUCCESS': 'Success',
      'PARTIAL_SUCCESS': 'Partial',
      'FAILED': 'Failed',
      'EMPLOYEE_NOT_FOUND': 'Employee not found',
      'OCR_ERROR': 'OCR error',
      'INVALID_DOCUMENT': 'Invalid document'
    };
    return map[status] || status;
  }
}