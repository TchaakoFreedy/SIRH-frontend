import { Component, Input, OnInit, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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
    }
    .chart-container {
      height: 200px;
      position: relative;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) labels!: string[];
  @Input({ required: true }) datasets!: ChartConfiguration['data']['datasets'];
  @Input() type: 'line' | 'bar' | 'doughnut' | 'pie' = 'line';
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnInit() {
    // Si les données changent, on peut réinitialiser le chart (à gérer via ngOnChanges, mais simplifié ici)
  }

  private renderChart() {
    if (!this.canvasRef) return;
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: this.type,
      data: {
        labels: this.labels,
        datasets: this.datasets.map(ds => ({
          ...ds,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
        },
        scales: this.type === 'doughnut' || this.type === 'pie' ? undefined : {
          y: { beginAtZero: true },
        },
      },
    });
  }
}