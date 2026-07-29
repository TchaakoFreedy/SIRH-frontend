import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-card">
      <div class="icon-wrapper" [style.background-color]="color + '20'" [style.color]="color">
        <span class="material-symbols-outlined">{{ icon }}</span>
      </div>
      <p class="title">{{ title }}</p>
      <h3 class="value">{{ value | number }}</h3>
      @if (evolution) {
        <div class="evolution">
          <span class="material-symbols-outlined">trending_up</span>
          <span>{{ evolution }}</span>
        </div>
      }
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
    }
    .stats-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);
    }
    .icon-wrapper {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }
    .icon-wrapper .material-symbols-outlined {
      font-size: 1.5rem;
    }
    .title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6c797b;
      font-weight: 500;
    }
    .value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #161d1f;
      margin: 0.25rem 0 0.25rem 0;
    }
    .evolution {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #006d37;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .evolution .material-symbols-outlined {
      font-size: 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: number;
  @Input() color: string = '#006972'; // primary
  @Input() evolution?: string;
}