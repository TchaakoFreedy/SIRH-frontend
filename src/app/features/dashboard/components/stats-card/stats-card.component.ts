import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-card">
      <div class="stats-card__header">
        <div class="stats-card__title-wrapper">
          <div class="stats-card__icon" [style.background-color]="color + '20'" [style.color]="color">
            <span class="material-symbols-outlined">{{ icon }}</span>
          </div>
          <p class="stats-card__title">{{ title }}</p>
        </div>
        @if (evolution) {
          <div class="stats-card__evolution" [style.color]="evolutionColor" [style.background-color]="evolutionColor + '15'">
            <span class="material-symbols-outlined">{{ evolutionIcon }}</span>
            <span>{{ evolution }}</span>
          </div>
        }
      </div>
      <div class="stats-card__value-wrapper">
        <h3 class="stats-card__value">{{ value | number }}</h3>
        @if (subValue) {
          <span class="stats-card__sub-value">{{ subValue }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .stats-card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.03);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 100px;
    }
    .stats-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);
    }

    /* ===== HEADER ===== */
    .stats-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .stats-card__title-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
      flex: 1;
    }

    .stats-card__icon {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.625rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s;
    }
    .stats-card__icon .material-symbols-outlined {
      font-size: 1.25rem;
    }
    .stats-card:hover .stats-card__icon {
      transform: scale(1.05);
    }

    .stats-card__title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6c797b;
      font-weight: 600;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ===== EVOLUTION ===== */
    .stats-card__evolution {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 0.5rem;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .stats-card__evolution .material-symbols-outlined {
      font-size: 0.85rem;
    }

    /* ===== VALUE ===== */
    .stats-card__value-wrapper {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .stats-card__value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #161d1f;
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
      word-break: break-word;
    }

    .stats-card__sub-value {
      font-size: 0.75rem;
      color: #6c797b;
      font-weight: 500;
      flex-shrink: 0;
    }

    /* ==========================================================
       RESPONSIVE
       ========================================================== */

    /* Tablettes et petits écrans */
    @media (max-width: 1024px) {
      .stats-card {
        padding: 1rem;
        min-height: 90px;
      }
      .stats-card__value {
        font-size: 1.5rem;
      }
      .stats-card__icon {
        width: 2rem;
        height: 2rem;
      }
      .stats-card__icon .material-symbols-outlined {
        font-size: 1.1rem;
      }
      .stats-card__title {
        font-size: 0.7rem;
      }
    }

    @media (max-width: 768px) {
      .stats-card {
        padding: 0.875rem;
        min-height: 80px;
        border-radius: 0.875rem;
      }
      .stats-card__value {
        font-size: 1.25rem;
      }
      .stats-card__header {
        gap: 0.5rem;
      }
      .stats-card__title-wrapper {
        gap: 0.5rem;
      }
      .stats-card__icon {
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 0.5rem;
      }
      .stats-card__icon .material-symbols-outlined {
        font-size: 1rem;
      }
      .stats-card__title {
        font-size: 0.65rem;
      }
      .stats-card__evolution {
        font-size: 0.55rem;
        padding: 0.1rem 0.4rem;
      }
      .stats-card__evolution .material-symbols-outlined {
        font-size: 0.75rem;
      }
      .stats-card__sub-value {
        font-size: 0.65rem;
      }
    }

    @media (max-width: 480px) {
      .stats-card {
        padding: 0.75rem;
        min-height: 70px;
        border-radius: 0.75rem;
        gap: 0.25rem;
      }
      .stats-card__value {
        font-size: 1.1rem;
      }
      .stats-card__header {
        gap: 0.35rem;
      }
      .stats-card__title-wrapper {
        gap: 0.35rem;
      }
      .stats-card__icon {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 0.4rem;
      }
      .stats-card__icon .material-symbols-outlined {
        font-size: 0.875rem;
      }
      .stats-card__title {
        font-size: 0.6rem;
        letter-spacing: 0.03em;
      }
      .stats-card__evolution {
        font-size: 0.5rem;
        padding: 0.1rem 0.35rem;
        border-radius: 0.35rem;
      }
      .stats-card__evolution .material-symbols-outlined {
        font-size: 0.65rem;
      }
      .stats-card__value-wrapper {
        gap: 0.25rem;
      }
      .stats-card__sub-value {
        font-size: 0.6rem;
      }
    }

    /* Très petits écrans */
    @media (max-width: 360px) {
      .stats-card {
        padding: 0.625rem;
        min-height: 60px;
        border-radius: 0.625rem;
      }
      .stats-card__value {
        font-size: 1rem;
      }
      .stats-card__icon {
        width: 1.25rem;
        height: 1.25rem;
      }
      .stats-card__icon .material-symbols-outlined {
        font-size: 0.75rem;
      }
      .stats-card__title {
        font-size: 0.55rem;
      }
      .stats-card__evolution {
        font-size: 0.45rem;
        padding: 0.05rem 0.3rem;
      }
      .stats-card__evolution .material-symbols-outlined {
        font-size: 0.6rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: number;
  @Input() color: string = '#006972';
  @Input() evolution?: string;
  @Input() evolutionColor: string = '#006d37';
  @Input() evolutionIcon: string = 'trending_up';
  @Input() subValue?: string;
}