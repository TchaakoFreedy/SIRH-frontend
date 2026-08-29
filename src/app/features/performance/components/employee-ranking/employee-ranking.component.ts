// src/app/features/performance/components/employee-ranking/employee-ranking.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PerformanceService } from '../../services/performance.service';
import { ClassementDTO } from '../../models/classement.model';
import { AuthService } from '../../../../services/auth.service';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, forkJoin } from 'rxjs';
import { DepartementService } from '../../../../core/services/departement.service';

interface Particle {
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

@Component({
  selector: 'app-employee-ranking',
  standalone: false,
  templateUrl: './employee-ranking.component.html',
  styleUrls: ['./employee-ranking.component.scss']
})
export class EmployeeRankingComponent implements OnInit, OnDestroy {
  
  isLoading = false;
  ranking: ClassementDTO[] = [];
  filteredRanking: ClassementDTO[] = [];
  currentYear = new Date().getFullYear();
  years: number[] = [];
  
  searchTerm = '';
  searchControl = new FormControl('');
  selectedYear = this.currentYear;
  filterByDepartment = '';
  departments: string[] = [];
  
  pageSize = 20;
  currentPage = 0;
  totalItems = 0;
  
  currentEmployeeId: string | null = null;
  
  private departmentCache: Map<string, string> = new Map();
  private searchSubscription?: Subscription;

  // Pour les feux d'artifice
  bestScore = 0;
  bestEmployeeId: string | null = null;
  particles: Particle[] = [];
  showFireworks = false;

  Math = Math;

  rankColors: Record<number, string> = {
    1: '#f59e0b',
    2: '#9ca3af',
    3: '#cd7f32'
  };

  mentionMapping: Record<string, { label: string; class: string; color: string }> = {
    'EXCEPTIONNEL': { label: 'Exceptionnel', class: 'exceptionnel', color: '#10b981' },
    'EXCELLENT': { label: 'Exceptionnel', class: 'exceptionnel', color: '#10b981' },
    'TRES_BIEN': { label: 'Très Bien', class: 'tres_bien', color: '#3b82f6' },
    'TRÈS_BIEN': { label: 'Très Bien', class: 'tres_bien', color: '#3b82f6' },
    'BIEN': { label: 'Bien', class: 'bien', color: '#06b6d4' },
    'ASSEZ_BIEN': { label: 'Assez Bien', class: 'assez_bien', color: '#8b5cf6' },
    'MOYEN': { label: 'Moyen', class: 'moyen', color: '#f59e0b' },
    'INSUFFISANT': { label: 'Insuffisant', class: 'insuffisant', color: '#ef4444' },
    'TRES BIEN': { label: 'Très Bien', class: 'tres_bien', color: '#3b82f6' },
    'TRÈS BIEN': { label: 'Très Bien', class: 'tres_bien', color: '#3b82f6' },
    'ASSEZ BIEN': { label: 'Assez Bien', class: 'assez_bien', color: '#8b5cf6' }
  };

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private departementService: DepartementService
  ) {}

  ngOnInit(): void {
    console.log('EmployeeRankingComponent initialisé');
    
    for (let year = this.currentYear; year >= 2020; year--) {
      this.years.push(year);
    }
    
    this.currentEmployeeId = this.authService.getCurrentUserId();
    
    this.searchSubscription = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => {
        this.searchTerm = term?.toLowerCase() || '';
        this.applyFilters();
      });
    
    this.loadRanking();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadRanking(): void {
    this.isLoading = true;
    this.bestEmployeeId = null;
    this.particles = [];
    this.showFireworks = false;
    console.log('Chargement du classement pour l\'année:', this.selectedYear);
    
    this.performanceService.getClassement(this.selectedYear).subscribe({
      next: (data) => {
        console.log('Classement reçu:', data);
        
        this.ranking = data || [];
        this.totalItems = this.ranking.length;
        
        const departmentIds = new Set<string>();
        this.ranking.forEach(item => {
          if (item.departementId) {
            departmentIds.add(item.departementId);
          }
        });
        
        if (departmentIds.size > 0) {
          this.loadDepartmentNames(Array.from(departmentIds));
        } else {
          this.updateRankingData();
          this.applyFilters();
          this.detectBestPerformance();
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Erreur chargement classement:', error);
        this.snackBar.open('Erreur lors du chargement du classement', 'Fermer', { duration: 3000 });
        this.isLoading = false;
        this.ranking = [];
        this.filteredRanking = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadDepartmentNames(departmentIds: string[]): void {
    const requests = departmentIds.map(id => 
      this.departementService.getById(id)
    );
    
    forkJoin(requests).subscribe({
      next: (departements) => {
        departements.forEach((dept, index) => {
          if (dept && dept.name) {
            this.departmentCache.set(departmentIds[index], dept.name);
          } else {
            this.departmentCache.set(departmentIds[index], 'Département inconnu');
          }
        });
        
        this.updateRankingData();
        this.applyFilters();
        this.detectBestPerformance();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des départements:', error);
        this.updateRankingData();
        this.applyFilters();
        this.detectBestPerformance();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateRankingData(): void {
    this.ranking = this.ranking.map(item => {
      let departmentName = item.departementNom || 'Non attribué';
      if (item.departementId && this.departmentCache.has(item.departementId)) {
        departmentName = this.departmentCache.get(item.departementId)!;
      }
      
      let mentionValue = item.mention;
      if (!mentionValue || mentionValue === '' || mentionValue === 'null' || mentionValue === 'undefined') {
        mentionValue = 'N/A';
      }
      
      let mentionKey = mentionValue.toUpperCase().trim();
      mentionKey = mentionKey
        .replace(/É/g, 'E')
        .replace(/È/g, 'E')
        .replace(/Ê/g, 'E')
        .replace(/Ë/g, 'E')
        .replace(/À/g, 'A')
        .replace(/Â/g, 'A')
        .replace(/Î/g, 'I')
        .replace(/Ô/g, 'O')
        .replace(/Ù/g, 'U');
      
      return {
        ...item,
        departementNom: departmentName,
        mention: mentionKey
      };
    });
    
    const depts = new Set<string>();
    this.ranking.forEach(item => {
      if (item.departementNom && 
          item.departementNom !== 'Non attribué' && 
          item.departementNom !== 'Département inconnu') {
        depts.add(item.departementNom);
      }
    });
    this.departments = Array.from(depts).sort();
  }

  applyFilters(): void {
    let filtered = [...this.ranking];
    
    if (this.searchTerm) {
      filtered = filtered.filter(item => 
        item.employeNom?.toLowerCase().includes(this.searchTerm) ||
        item.departementNom?.toLowerCase().includes(this.searchTerm) ||
        item.entrepriseNom?.toLowerCase().includes(this.searchTerm)
      );
    }
    
    if (this.filterByDepartment) {
      filtered = filtered.filter(item => 
        item.departementNom === this.filterByDepartment
      );
    }
    
    this.filteredRanking = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 0;
  }

  /** Détecte le meilleur score et déclenche les feux d'artifice */
  private detectBestPerformance(): void {
    if (this.filteredRanking.length === 0) {
      this.bestEmployeeId = null;
      this.particles = [];
      this.showFireworks = false;
      return;
    }

    let best = this.filteredRanking[0];
    this.bestScore = best.scoreTotal || 0;
    for (const item of this.filteredRanking) {
      if ((item.scoreTotal || 0) > this.bestScore) {
        this.bestScore = item.scoreTotal || 0;
        best = item;
      }
    }

    // Si le score est >= 80, on déclenche les feux d'artifice
    if (this.bestScore >= 80 && best.employeId) {
      this.bestEmployeeId = best.employeId;
      this.generateFireworks();
      this.showFireworks = true;
    } else {
      this.bestEmployeeId = null;
      this.particles = [];
      this.showFireworks = false;
    }
  }

  /** Génère les particules de feux d'artifice */
  private generateFireworks(): void {
    const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
    const count = 100;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = 15 + Math.random() * 55;
      this.particles.push({
        x: 50 + Math.cos(angle) * distance,
        y: 50 + Math.sin(angle) * distance,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 9,
        delay: Math.random() * 0.8,
        duration: 0.8 + Math.random() * 1.5
      });
    }
  }

  /** Vérifie si un employé est le meilleur */
  isBestEmployee(employeeId: string): boolean {
    return this.bestEmployeeId === employeeId;
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.departmentCache.clear();
    this.loadRanking();
  }

  onDepartmentChange(department: string): void {
    this.filterByDepartment = department;
    this.applyFilters();
    this.detectBestPerformance();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.searchTerm = '';
    this.filterByDepartment = '';
    this.applyFilters();
    this.detectBestPerformance();
  }

  getRankColor(rang: number): string {
    return this.rankColors[rang] || '#6b7280';
  }

  getMentionLabel(mention: string | undefined | null): string {
    if (!mention || mention === 'N/A' || mention === 'null' || mention === '') {
      return 'Non évalué';
    }
    const key = mention.toUpperCase().trim();
    const info = this.mentionMapping[key];
    return info?.label || mention;
  }

  getMentionColor(mention: string | undefined | null): string {
    if (!mention || mention === 'N/A' || mention === 'null' || mention === '') {
      return '#6c757d';
    }
    const key = mention.toUpperCase().trim();
    const info = this.mentionMapping[key];
    return info?.color || '#6c757d';
  }

  getMentionClass(mention: string | undefined | null): string {
    if (!mention || mention === 'N/A' || mention === 'null' || mention === '') {
      return 'secondary';
    }
    const key = mention.toUpperCase().trim();
    const info = this.mentionMapping[key];
    return info?.class || 'secondary';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  isCurrentUser(employeeId: string): boolean {
    return this.currentEmployeeId === employeeId;
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  /** Retourne le pourcentage pour la barre de progression (basé sur 100) */
  getScorePercentage(score: number | undefined): number {
    if (score === undefined || score === null) return 0;
    return Math.min(100, Math.max(0, score));
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  getPaginatedData(): ClassementDTO[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRanking.slice(start, end);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages() - 1) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const total = this.getTotalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }
    
    const pages: number[] = [];
    const current = this.currentPage;
    
    if (current <= 3) {
      for (let i = 0; i <= 4; i++) pages.push(i);
      pages.push(-1);
      pages.push(total - 1);
    } else if (current >= total - 4) {
      pages.push(0);
      pages.push(-1);
      for (let i = total - 5; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      pages.push(-1);
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push(-1);
      pages.push(total - 1);
    }
    
    return pages;
  }
}