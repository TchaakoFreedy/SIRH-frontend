// src/app/features/pay-slip/pay-slip-upload.component.ts

import { Component, ChangeDetectorRef, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, timeout, firstValueFrom, finalize } from 'rxjs';
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
export class PaySlipUploadComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  uploading = false;
  isProcessing = false;
  response: PaySlipUploadResponse | null = null;
  error = '';
  progress = 0;
  hasSucceeded = false;
  isUploadCompleted = false;
  isDragging = false;
  private uploadId = 0;
  private destroy$ = new Subject<void>();
  private isUploadingLocked = false;
  private clickTimeout: any = null;
  private isUploadFinalized = false;
  
  tokenStatus: string = '';
  tokenExpiry: string = '';

  constructor(
    private paySlipService: PaySlipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.checkTokenStatus();
  }

  ngAfterViewInit(): void {
    // Desactiver le double clic sur le bouton d'upload
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.warn('Double clic bloque');
      });
      
      // Desactiver les clics multiples sur le bouton
      uploadBtn.addEventListener('click', (e) => {
        if (this.isUploadFinalized || this.hasSucceeded || this.isUploadCompleted) {
          e.preventDefault();
          e.stopPropagation();
          console.warn('Upload finalise, clic ignore');
        }
      });
    }

    // Desactiver le comportement par defaut du formulaire
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.warn('Soumission de formulaire bloquee');
        return false;
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
  }

  private checkTokenStatus(): void {
    const token = localStorage.getItem('access_token');
    const isValid = this.authService.isTokenValid();
    
    this.tokenStatus = token ? (isValid ? 'Valide' : 'Expire') : 'Absent';
    
    if (token && isValid) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = new Date(payload.exp * 1000);
        this.tokenExpiry = exp.toLocaleString();
        console.log(`Token valide jusqu'a: ${this.tokenExpiry}`);
      } catch (e) {
        console.error('Impossible de decoder le token');
      }
    }
    
    console.log(`Etat du token: ${this.tokenStatus}`);
  }

  onFileSelected(event: Event): void {
    if (this.isProcessing || this.uploading || this.isUploadingLocked || this.isUploadFinalized || this.hasSucceeded) {
      console.warn('Traitement en cours ou termine, selection ignoree');
      event.preventDefault();
      return;
    }
    
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    
    if (this.isProcessing || this.uploading || this.isUploadingLocked || this.isUploadFinalized || this.hasSucceeded) {
      console.warn('Traitement en cours ou termine, drop ignore');
      return;
    }
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        this.handleFile(file);
      } else {
        this.error = 'Veuillez deposer un fichier PDF valide.';
        this.cdr.detectChanges();
      }
    }
  }

  private handleFile(file: File): void {
    console.log(`Fichier selectionne: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    if (file.size > 10 * 1024 * 1024) {
      this.error = 'Le fichier est trop volumineux (max 10MB).';
      this.cdr.detectChanges();
      return;
    }
    
    this.selectedFile = file;
    this.response = null;
    this.error = '';
    this.progress = 0;
    this.hasSucceeded = false;
    this.isUploadCompleted = false;
    this.isUploadFinalized = false;
    this.uploadId = 0;
    this.isUploadingLocked = false;
    this.cdr.detectChanges();
  }

  upload(): void {
    console.log(`upload() appele a ${new Date().toISOString()}`);

    // Verifier si l'upload est deja finalise
    if (this.isUploadFinalized || this.hasSucceeded || this.isUploadCompleted) {
      console.warn('Upload deja finalise, ignore');
      return;
    }

    // Debounce pour eviter les clics multiples
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }

    this.clickTimeout = setTimeout(() => {
      this.clickTimeout = null;
    }, 300);

    if (this.uploading || this.isProcessing || this.isUploadingLocked) {
      console.warn('Upload deja en cours, ignore');
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Veuillez selectionner un fichier PDF';
      this.unlockAndReset();
      return;
    }

    const token = localStorage.getItem('access_token');
    console.log(`Token avant upload: ${token ? 'Present' : 'Absent'}`);
    
    if (!this.authService.hasValidToken()) {
      this.error = 'Votre session a expire. Veuillez vous reconnecter.';
      this.authService.logout();
      this.unlockAndReset();
      return;
    }

    this.isUploadingLocked = true;
    this.uploading = true;
    this.isProcessing = true;
    this.error = '';
    this.response = null;
    this.progress = 0;
    this.hasSucceeded = false;
    this.isUploadCompleted = false;
    this.isUploadFinalized = false;
    this.uploadId++;
    this.cdr.detectChanges();

    console.log(`Upload verrouille (ID #${this.uploadId})`);

    this.doUpload();
  }

  private async doUpload(): Promise<void> {
    if (!this.selectedFile) {
      this.error = 'Veuillez selectionner un fichier PDF';
      this.unlockAndReset();
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    console.log(`Envoi de la requete HTTP avec cle: ${idempotencyKey}`);

    const token = localStorage.getItem('access_token');
    console.log(`Token dans doUpload: ${token ? 'Present' : 'Absent'}`);
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = new Date(payload.exp * 1000);
        console.log(`Expiration du token: ${exp.toLocaleString()}`);
        console.log(`Temps restant: ${Math.floor((payload.exp * 1000 - Date.now()) / 60000)} minutes`);
      } catch (e) {
        console.error('Impossible de decoder le token');
      }
    }

    const progressInterval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
        this.cdr.detectChanges();
      }
    }, 500);

    try {
      // Marquer l'upload comme finalise avant de faire la requete
      this.isUploadFinalized = true;
      this.isUploadingLocked = false;
      
      const res = await firstValueFrom(
        this.paySlipService.upload(this.selectedFile, idempotencyKey).pipe(
          timeout(300000),
          finalize(() => {
            console.log(`Finalisation de l'upload (ID #${this.uploadId})`);
          })
        )
      );

      console.log(`Upload reussi (ID #${this.uploadId})`);
      console.log('Reponse:', res);
      
      this.hasSucceeded = true;
      this.isUploadCompleted = true;
      this.response = res;
      
      const input = this.fileInput?.nativeElement;
      if (input) {
        input.value = '';
        console.log('Input file reinitialise');
      }
      
      this.progress = 100;
      this.cdr.detectChanges();

      // Desactiver le bouton d'upload apres reussite
      this.ngZone.runOutsideAngular(() => {
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
          uploadBtn.setAttribute('disabled', 'true');
        }
      });

    } catch (err) {
      // Si l'upload a deja reussi, ignorer les erreurs secondaires
      if (this.hasSucceeded || this.isUploadCompleted) {
        console.warn('Erreur secondaire ignoree (upload deja reussi)');
        return;
      }

      const error = err as any;
      console.error('Erreur capturee dans le composant:', error);

      if (error === 'canceled' || error?.message === 'canceled') {
        console.warn('Upload annule');
        return;
      }

      let msg = 'Erreur lors de l\'upload : ';
      const status = error.status || error.originalError?.status;

      console.log(`Status code: ${status}`);

      switch (status) {
        case 0:
          msg += 'Le serveur ne repond pas. Verifiez votre connexion.';
          break;
        case 401:
          msg += 'Votre session a expire. Veuillez vous reconnecter.';
          this.authService.logout();
          break;
        case 403:
          msg += 'Vous n\'avez pas les permissions requises.';
          break;
        case 409:
          msg += 'Upload deja en cours pour ce fichier.';
          break;
        case 413:
          msg += 'Le fichier est trop volumineux (max 10MB).';
          break;
        case 400:
          msg += 'Le fichier n\'est pas un PDF valide ou la requete est incorrecte.';
          break;
        case 500:
          msg += 'Erreur serveur. Veuillez reessayer plus tard.';
          break;
        default:
          msg += error.message || 'Erreur inconnue';
      }

      this.error = msg;
      this.cdr.detectChanges();

    } finally {
      clearInterval(progressInterval);
      // Deverrouiller mais garder le flag de finalisation
      this.uploading = false;
      this.isProcessing = false;
      this.isUploadingLocked = false;
      this.cdr.detectChanges();
      console.log(`Verrouillage libere (ID #${this.uploadId})`);
    }
  }

  private unlockAndReset(): void {
    this.uploading = false;
    this.isProcessing = false;
    this.isUploadingLocked = false;
    this.cdr.detectChanges();
  }

  resetForm(): void {
    if (this.isProcessing || this.uploading || this.isUploadingLocked) {
      console.warn('Traitement en cours, reinitialisation ignoree');
      return;
    }
    
    this.selectedFile = null;
    this.response = null;
    this.error = '';
    this.progress = 0;
    this.hasSucceeded = false;
    this.isUploadCompleted = false;
    this.isUploadFinalized = false;
    this.uploadId = 0;
    this.isUploadingLocked = false;
    this.isDragging = false;
    
    const input = this.fileInput?.nativeElement;
    if (input) {
      input.value = '';
    }
    
    this.uploading = false;
    this.isProcessing = false;
    this.cdr.detectChanges();

    // Reactiver le bouton
    this.ngZone.runOutsideAngular(() => {
      const uploadBtn = document.getElementById('uploadBtn');
      if (uploadBtn) {
        uploadBtn.removeAttribute('disabled');
      }
    });
  }

  get isUploadingOrProcessing(): boolean {
    return this.uploading || this.isProcessing || this.isUploadingLocked;
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