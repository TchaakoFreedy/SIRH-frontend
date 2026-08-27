// src/app/features/dashboard/components/chart-card/chart-card.component.ts

import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-card">
      <div class="header">
        <h4>{{ title }}</h4>
      </div>
      <div class="chart-container">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.03);
      width: 100%;
      min-width: 280px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .header h4 {
      font-weight: 600;
      color: #161d1f;
      font-size: 1.1rem;
      margin: 0;
    }
    .chart-container {
      height: 250px;
      width: 100%;
      position: relative;
    }
    .chart-container canvas {
      width: 100% !important;
      height: 100% !important;
    }
    .no-data {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #94a3b8;
      font-size: 0.9rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent implements OnInit, OnChanges, AfterViewInit {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) labels!: string[];
  @Input({ required: true }) datasets!: ChartConfiguration['data']['datasets'];
  @Input() type: 'line' | 'bar' | 'doughnut' | 'pie' = 'line';
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private isViewInitialized = false;

  ngOnInit(): void {
    // Rien de spécifique ici
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isViewInitialized && (changes['labels'] || changes['datasets'] || changes['type'])) {
      this.renderChart();
    }
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    setTimeout(() => {
      this.renderChart();
    }, 100);
  }

  private renderChart(): void {
    if (!this.canvasRef) return;
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Vérifier si des données sont disponibles
    const hasData = this.datasets && this.datasets.some(ds => ds.data && ds.data.length > 0 && ds.data.some((v: any) => v !== null && v !== undefined && v !== 0));

    if (!hasData) {
      // Si pas de données, afficher un message
      const parent = this.canvasRef.nativeElement.parentElement;
      if (parent) {
        // Supprimer l'ancien message "no-data" s'il existe
        const oldMessage = parent.querySelector('.no-data');
        if (oldMessage) {
          oldMessage.remove();
        }
        const message = document.createElement('div');
        message.className = 'no-data';
        message.textContent = 'Aucune donnée disponible';
        parent.appendChild(message);
      }
      return;
    }

    // Supprimer l'ancien message "no-data" s'il existe
    const parent = this.canvasRef.nativeElement.parentElement;
    if (parent) {
      const oldMessage = parent.querySelector('.no-data');
      if (oldMessage) {
        oldMessage.remove();
      }
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Préparer les données pour Chart.js
    const chartData = {
      labels: this.labels || [],
      datasets: this.datasets.map(ds => ({
        ...ds,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      })),
    };

    // Configuration du graphique
    const isPieOrDoughnut = this.type === 'doughnut' || this.type === 'pie';
    const options: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: isPieOrDoughnut ? 'bottom' : 'top',
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: isPieOrDoughnut ? undefined : {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)',
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    };

    this.chart = new Chart(ctx, {
      type: this.type,
      data: chartData,
      options: options,
    });
  }
}