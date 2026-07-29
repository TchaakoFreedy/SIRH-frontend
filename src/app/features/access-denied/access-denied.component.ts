// src/app/features/access-denied/access-denied.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="access-denied-container">
      <div class="access-denied-content">
        <div class="access-denied-icon">
          <span class="material-symbols-outlined">block</span>
        </div>
        <h1>Accès Refusé</h1>
        <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <p class="sub-text">Veuillez contacter votre administrateur si vous pensez que c'est une erreur.</p>
        <button class="btn btn-primary" routerLink="/app/dashboard">
          <span class="material-symbols-outlined">home</span>
          Retour au Dashboard
        </button>
      </div>
    </div>
  `,
  styles: [`
    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 20px;
    }

    .access-denied-content {
      background: white;
      padding: 60px 40px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }

    .access-denied-icon {
      width: 80px;
      height: 80px;
      background: #fef2f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }

    .access-denied-icon span {
      font-size: 48px;
      color: #ef4444;
    }

    h1 {
      color: #0f172a;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 12px 0;
    }

    p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 8px 0;
    }

    .sub-text {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 32px;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0d9488, #14b8a6);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(13, 148, 136, 0.3);
    }

    .btn-primary span {
      font-size: 20px;
    }

    @media (max-width: 480px) {
      .access-denied-content {
        padding: 40px 20px;
      }

      h1 {
        font-size: 24px;
      }
    }
  `]
})
export class AccessDeniedComponent {}