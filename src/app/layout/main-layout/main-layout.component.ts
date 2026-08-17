import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private breakpointObserver = inject(BreakpointObserver);
  private destroy$ = new Subject<void>();

  isMobile = signal(false);
  sidebarOpen = signal(false);
  sidebarCollapsed = signal(false);

  ngOnInit(): void {
    console.log('MainLayoutComponent initialisé');
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const mobile = result.matches;
        console.log('Écran mobile ?', mobile);
        this.isMobile.set(mobile);
        if (!mobile) {
          this.sidebarOpen.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}