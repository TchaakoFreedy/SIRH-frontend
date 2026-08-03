// src/app/features/pay-slip/pay-slip-upload.component.ts
import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, timeout, firstValueFrom } from 'rxjs';
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
export class PaySlipUploadComponent implements OnInit, OnDestroy {
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
  
  // ✅ Ajout pour le débogage
  tokenStatus: string = '';
  tokenExpiry: string = '';

  constructor(
    private paySlipService: PaySlipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkTokenStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkTokenStatus(): void {
    const token = localStorage.getItem('access_token');
    const isValid = this.authService.isTokenValid();
    
    this.tokenStatus = token ? (isValid ? '✅ Valide' : '❌ Expiré') : '❌ Absent';
    
    if (token && isValid) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = new Date(payload.exp * 1000);
        this.tokenExpiry = exp.toLocaleString();
        console.log(`🔑 Token valide jusqu'à: ${this.tokenExpiry}`);
      } catch (e) {
        console.error('❌ Impossible de décoder le token');
      }
    }
    
    console.log(`🔑 État du token: ${this.tokenStatus}`);
  }

  onFileSelected(event: Event): void {
    if (this.isProcessing || this.uploading) {
      console.warn('⏳ Traitement en cours, sélection ignorée');
      return;
    }
    
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log(`📁 Fichier sélectionné: ${this.selectedFile.name} (${(this.selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
      
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
    console.log(`🔄 upload() appelé à ${new Date().toISOString()}`);

    // 🔒 LOCK ATOMIQUE
    if (this.uploading || this.isProcessing || this.isUploadCompleted || this.hasSucceeded) {
      console.warn('⏳ Upload déjà en cours ou terminé, ignoré');
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Veuillez sélectionner un fichier PDF';
      this.unlockAndReset();
      return;
    }

    // ✅ Vérification du token avant upload
    const token = localStorage.getItem('access_token');
    console.log(`🔑 Token avant upload: ${token ? '✅ Présent' : '❌ Absent'}`);
    
    if (!this.authService.hasValidToken()) {
      this.error = 'Votre session a expiré. Veuillez vous reconnecter.';
      this.authService.logout();
      this.unlockAndReset();
      return;
    }

    this.uploading = true;
    this.isProcessing = true;
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
    if (!this.selectedFile) {
      this.error = 'Veuillez sélectionner un fichier PDF';
      this.unlockAndReset();
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    console.log(`📤 Envoi de la requête HTTP avec clé: ${idempotencyKey}`);

    // ✅ Vérification du token avant l'appel HTTP
    const token = localStorage.getItem('access_token');
    console.log(`🔑 Token dans doUpload: ${token ? '✅ Présent' : '❌ Absent'}`);
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = new Date(payload.exp * 1000);
        console.log(`⏰ Expiration du token: ${exp.toLocaleString()}`);
        console.log(`⏱️ Temps restant: ${Math.floor((payload.exp * 1000 - Date.now()) / 60000)} minutes`);
      } catch (e) {
        console.error('❌ Impossible de décoder le token');
      }
    }

    const progressInterval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
        this.cdr.detectChanges();
      }
    }, 500);

    try {
      const res = await firstValueFrom(
        this.paySlipService.upload(this.selectedFile, idempotencyKey).pipe(
          timeout(300000)
        )
      );

      console.log(`✅ Upload réussi (ID #${this.uploadId})`);
      console.log('📊 Réponse:', res);
      
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
      console.error('❌ Erreur capturée dans le composant:', error);

      if (this.hasSucceeded || this.isUploadCompleted) {
        console.warn('⚠️ Erreur secondaire ignorée (upload déjà réussi)');
        return;
      }
      
      if (error === 'canceled' || error?.message === 'canceled') {
        console.warn('⏹️ Upload annulé');
        return;
      }

      let msg = 'Erreur lors de l\'upload : ';
      const status = error.status || error.originalError?.status;

      console.log(`📊 Status code: ${status}`);

      switch (status) {
        case 0:
          msg += 'Le serveur ne répond pas. Vérifiez votre connexion.';
          break;
        case 401:
          msg += 'Votre session a expiré. Veuillez vous reconnecter.';
          this.authService.logout();
          break;
        case 403:
          msg += 'Accès refusé. Votre session a expiré ou vous n\'avez pas les permissions requises.';
          this.authService.logout();
          break;
        case 413:
          msg += 'Le fichier est trop volumineux (max 10MB).';
          break;
        case 400:
          msg += 'Le fichier n\'est pas un PDF valide ou la requête est incorrecte.';
          break;
        case 500:
          msg += 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        default:
          msg += error.message || 'Erreur inconnue';
      }

      this.error = msg;
      this.cdr.detectChanges();

    } finally {
      clearInterval(progressInterval);
      this.unlockAndReset();
      console.log(`🔓 Verrouillage libéré (ID #${this.uploadId})`);
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

  // Getters
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