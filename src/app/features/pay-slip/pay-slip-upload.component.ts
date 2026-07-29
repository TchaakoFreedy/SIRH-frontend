import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, timeout, firstValueFrom } from 'rxjs';
import { PaySlipService } from '../../core/services/pay-slip.service';
import { PaySlipUploadResponse } from '../../core/models/pay-slip.model';
import { AuthService } from '../../services/auth.service';
 
@Component({
  selector: 'app-pay-slip-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pay-slip-upload.component.html',
  styleUrls: ['./pay-slip-upload.component.css']
})
export class PaySlipUploadComponent implements OnDestroy {
  selectedFile: File | null = null;
  uploading = false;
  isProcessing = false;
  response: PaySlipUploadResponse | null = null;
  error = '';
  progress = 0;
  hasSucceeded = false;
  isUploadCompleted = false;
  private uploadId = 0;
  private destroy$ = new Subject<void>();
 
  constructor(
    private paySlipService: PaySlipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}
 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  onFileSelected(event: Event): void {
    if (this.isProcessing || this.uploading) {
      console.warn('⏳ Traitement en cours, sélection ignorée');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.response = null;
      this.error = '';
      this.progress = 0;
      this.hasSucceeded = false;
      this.isUploadCompleted = false;
      this.uploadId = 0;
      this.cdr.detectChanges();
    }
  }
 
  upload(): void {
    console.trace(`📞 upload() called at ${new Date().toISOString()}`);
 
    // 🔒 LOCK ATOMIQUE — appel direct à doUpload(), sans Subject/debounce intermédiaire
    if (this.uploading || this.isProcessing || this.isUploadCompleted || this.hasSucceeded) {
      console.warn('⏳ Upload déjà en cours ou terminé, ignoré');
      return;
    }
 
    this.uploading = true;
    this.isProcessing = true;
 
    if (!this.selectedFile) {
      this.error = 'Veuillez sélectionner un fichier PDF';
      this.unlockAndReset();
      return;
    }
 
    if (!this.authService.hasValidToken()) {
      this.error = 'Votre session a expiré. Veuillez vous reconnecter.';
      this.authService.logout();
      this.unlockAndReset();
      return;
    }
 
    this.error = '';
    this.response = null;
    this.progress = 0;
    this.hasSucceeded = false;
    this.isUploadCompleted = false;
    this.uploadId++;
    this.cdr.detectChanges();
 
    console.log(`🔒 Upload verrouillé (ID #${this.uploadId})`);
 
    this.doUpload();
  }
 
  private async doUpload(): Promise<void> {
    if (this.isUploadCompleted || this.hasSucceeded) {
      console.warn('⏳ Upload déjà terminé, ignore dans doUpload');
      return;
    }
    if (!this.uploading || !this.isProcessing) {
      console.warn('⏳ Upload non verrouillé, ignore');
      return;
    }
    if (!this.selectedFile) {
      this.error = 'Veuillez sélectionner un fichier PDF';
      this.unlockAndReset();
      return;
    }
 
    const idempotencyKey = crypto.randomUUID();
    console.log(`🚀 Envoi de la requête HTTP avec clé: ${idempotencyKey}`);
 
    const progressInterval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
        this.cdr.detectChanges();
      }
    }, 500);
 
    try {
      const res = await firstValueFrom(
        this.paySlipService.upload(this.selectedFile, idempotencyKey).pipe(
          takeUntil(this.destroy$),
          timeout(300000)
        )
      );
 
      console.log(`✅ Upload réussi (ID #${this.uploadId})`);
      this.hasSucceeded = true;
      this.isUploadCompleted = true;
      this.response = res;
      this.selectedFile = null;
      const input = document.getElementById('fileInput') as HTMLInputElement;
      if (input) input.value = '';
      this.progress = 100;
      this.cdr.detectChanges();
 
    } catch (err) {
      const error = err as any;
      if (this.hasSucceeded || this.isUploadCompleted) {
        console.warn('⚠️ Erreur secondaire ignorée (upload déjà réussi)');
        return;
      }
      if (error === 'canceled' || error?.message === 'canceled') return;
 
      let msg = 'Erreur lors de l\'upload : ';
      if (error.status === 0) msg += 'Le serveur ne répond pas. Vérifiez votre connexion.';
      else if (error.status === 413) msg += 'Le fichier est trop volumineux.';
      else if (error.status === 400) msg += 'Le fichier n\'est pas un PDF valide.';
      else if (error.status === 403) {
        msg += 'Accès refusé. Votre session est peut-être expirée.';
        this.authService.logout();
      } else {
        msg += error.message || 'Erreur inconnue';
      }
      this.error = msg;
      this.cdr.detectChanges();
 
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        this.unlockAndReset();
        console.log(`🔓 Verrouillage libéré (ID #${this.uploadId})`);
      }, 500);
    }
  }
 
  private unlockAndReset(): void {
    this.uploading = false;
    this.isProcessing = false;
    this.progress = 100;
    this.cdr.detectChanges();
  }
 
  resetForm(): void {
    if (this.isProcessing || this.uploading) {
      console.warn('⏳ Traitement en cours, réinitialisation ignorée');
      return;
    }
    this.selectedFile = null;
    this.response = null;
    this.error = '';
    this.progress = 0;
    this.hasSucceeded = false;
    this.isUploadCompleted = false;
    this.uploadId = 0;
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) input.value = '';
    this.uploading = false;
    this.isProcessing = false;
    this.cdr.detectChanges();
  }
 
  get isUploadingOrProcessing(): boolean {
    return this.uploading || this.isProcessing;
  }
 
  get totalPages(): number {
    return this.response?.totalPages ?? this.response?.totalEmployeesProcessed ?? 0;
  }
 
  get successCount(): number {
    return this.response?.createdPayrolls ?? this.response?.successCount ?? 0;
  }
 
  get failureCount(): number {
    return this.response?.errors?.length ?? 0;
  }
 
  get hasMetrics(): boolean {
    return !!(this.response?.totalPages || this.response?.ocrPages);
  }
}