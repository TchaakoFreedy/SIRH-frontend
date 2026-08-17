// src/app/features/discipline/components/sanction/sanction-detail/sanction-detail.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SanctionService } from '../../../services/sanction.service';
import { Sanction, StatutSanction, StatutSanctionLabels, StatutSanctionColors, TypeSanctionLabels } from '../../../models/sanction.model';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { PermissionService } from '../../../../../core/services/permission.service';

@Component({
  selector: 'app-sanction-detail',
  standalone: true,
  templateUrl: './sanction-detail.component.html',
  styleUrls: ['./sanction-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ]
})
export class SanctionDetailComponent implements OnInit, OnDestroy {
  StatutSanction = StatutSanction;
  
  sanction: Sanction = {} as Sanction;
  isLoading = true;
  errorMessage: string = '';
  private subscription: Subscription | null = null;
  private returnUrl: string = '/app/discipline/sanctions';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private sanctionService: SanctionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    console.log('🟢🟢🟢 ngOnInit DEBUT 🟢🟢🟢');
    
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
        console.log('🔙 URL de retour depuis queryParams:', this.returnUrl);
      }
    });
    
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['returnUrl']) {
      this.returnUrl = navigation.extras.state['returnUrl'];
      console.log('🔙 URL de retour depuis state:', this.returnUrl);
    }
    
    const storedReturnUrl = localStorage.getItem('sanction_return_url');
    if (storedReturnUrl) {
      this.returnUrl = storedReturnUrl;
      console.log('🔙 URL de retour depuis localStorage:', this.returnUrl);
    }
    
    this.subscription = this.route.params.subscribe(params => {
      const id = params['id'];
      console.log('🔍 ID récupéré via params:', id);
      
      if (id) {
        console.log('✅ ID trouvé, chargement de la sanction...');
        this.loadSanction(id);
      } else {
        console.error('❌❌❌ AUCUN ID TROUVÉ ❌❌❌');
        this.errorMessage = 'ID de sanction non trouvé';
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('ID de sanction non trouvé', 'Fermer', { duration: 3000 });
        this.goBack();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    localStorage.removeItem('sanction_return_url');
  }

  loadSanction(id: string): void {
    console.log('🟡 loadSanction appelé avec ID:', id);
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    
    this.sanctionService.getSanctionById(id).subscribe({
      next: (data) => {
        console.log('✅✅✅ Sanction chargée avec succès ✅✅✅');
        this.sanction = data;
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('🔵 isLoading après chargement:', this.isLoading);
      },
      error: (error) => {
        console.error('❌❌❌ ERREUR lors du chargement ❌❌❌');
        this.isLoading = false;
        this.errorMessage = 'Erreur lors du chargement';
        this.cdr.detectChanges();
        
        if (error.status === 404) {
          this.snackBar.open('Sanction non trouvée', 'Fermer', { duration: 3000 });
        } else if (error.status === 401) {
          this.snackBar.open('Session expirée. Veuillez vous reconnecter.', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open('Erreur lors du chargement de la sanction', 'Fermer', { duration: 3000 });
        }
        this.goBack();
      }
    });
  }

  // ✅ Vérifier si l'utilisateur a la permission de lever une sanction
  hasLiftPermission(): boolean {
    return this.permissionService.hasPermissionSync('SANCTION_UPDATE') && this.canLift();
  }

  // ✅ Vérifier si l'utilisateur a la permission de supprimer
  hasDeletePermission(): boolean {
    return this.permissionService.hasPermissionSync('SANCTION_DELETE');
  }

  goBack(): void {
    console.log('🔙 Retour vers:', this.returnUrl);
    
    const currentUrl = this.router.url;
    if (this.returnUrl && this.returnUrl !== currentUrl) {
      this.router.navigate([this.returnUrl]).then(
        success => {
          if (!success) {
            this.location.back();
          }
        },
        () => {
          this.location.back();
        }
      );
    } else {
      try {
        this.location.back();
      } catch (e) {
        this.router.navigate(['/app/discipline/sanctions']);
      }
    }
  }

  trackHistorique(index: number, item: any): any {
    return item.id || index;
  }

  getTypeLabel(type: string): string {
    return TypeSanctionLabels[type as keyof typeof TypeSanctionLabels] || type;
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'AVERTISSEMENT_VERBAL': 'avertissement_verbal',
      'AVERTISSEMENT_ECRIT': 'avertissement_ecrit',
      'BLAME': 'blame',
      'MISE_A_PIED': 'mise_a_pied',
      'SUSPENSION': 'suspension',
      'MUTATION_DISCIPLINAIRE': 'mutation_disciplinaire',
      'LICENCIEMENT': 'licenciement',
      'AUTRE': 'autre'
    };
    return classes[type] || '';
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'AVERTISSEMENT_VERBAL': 'chat',
      'AVERTISSEMENT_ECRIT': 'description',
      'BLAME': 'warning',
      'MISE_A_PIED': 'hourglass_empty',
      'SUSPENSION': 'pause_circle',
      'MUTATION_DISCIPLINAIRE': 'swap_horiz',
      'LICENCIEMENT': 'cancel',
      'AUTRE': 'more_horiz'
    };
    return icons[type] || 'help';
  }

  getStatutLabel(statut: StatutSanction): string {
    return StatutSanctionLabels[statut] || statut;
  }

  getStatutClass(statut: StatutSanction): string {
    const classes: Record<StatutSanction, string> = {
      [StatutSanction.ACTIVE]: 'active',
      [StatutSanction.TERMINEE]: 'terminee',
      [StatutSanction.ANNULEE]: 'annulee'
    };
    return classes[statut] || '';
  }

  getStatutColor(statut: StatutSanction): string {
    return StatutSanctionColors[statut] || 'secondary';
  }

  canLift(): boolean {
    return this.sanction?.statut === StatutSanction.ACTIVE;
  }

  liftSanction(): void {
    if (confirm('Voulez-vous lever cette sanction ?')) {
      this.isLoading = true;
      this.sanctionService.liftSanction(this.sanction.id!).subscribe({
        next: () => {
          this.snackBar.open('✅ Sanction levée avec succès !', 'Fermer', { duration: 3000 });
          this.loadSanction(this.sanction.id!);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Erreur lors de la levée:', error);
          this.snackBar.open('Erreur lors de la levée', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  deleteSanction(): void {
    if (confirm('Voulez-vous supprimer cette sanction ? Cette action est irréversible.')) {
      this.isLoading = true;
      this.sanctionService.deleteSanction(this.sanction.id!).subscribe({
        next: () => {
          this.snackBar.open('Sanction supprimée avec succès', 'Fermer', { duration: 3000 });
          this.goBack();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Erreur lors de la suppression:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }
}