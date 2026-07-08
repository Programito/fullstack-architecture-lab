import { booleanAttribute, Component, computed, input, numberAttribute, output } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { BarChart, GaugeChart, LineChart, PieChart, RadarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EmptyState } from '../empty-state/empty-state';
import { Skeleton } from '../skeleton/skeleton';

echarts.use([
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  RadarChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export type ChartType = 'line' | 'bar' | 'horizontalBar' | 'stackedBar' | 'area' | 'pie' | 'donut' | 'pareto' | 'radar' | 'gauge';
export type ChartAppearance = 'default' | 'minimal';
export type ChartSize = 'sm' | 'md' | 'lg';
export type ChartVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

export type ChartSeries = {
  name: string;
  values: number[];
  color?: string;
};

export type ChartPointSelection = {
  seriesName: string;
  category: string;
  value: number;
};

@Component({
  selector: 'app-chart',
  imports: [NgxEchartsDirective, EmptyState, Skeleton],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './chart.html',
  styleUrl: './chart.css',
})
export class Chart {
  readonly type = input<ChartType>('line');
  readonly appearance = input<ChartAppearance>('default');
  readonly size = input<ChartSize>('md');
  readonly variant = input<ChartVariant>('primary');
  readonly data = input<ChartSeries[]>([]);
  readonly categories = input<string[]>([]);
  readonly title = input('');
  readonly description = input('');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly interactive = input(false, { transform: booleanAttribute });
  readonly emptyTitle = input('Sin datos');
  readonly emptyDescription = input('No hay datos para mostrar en esta grafica.');
  readonly max = input(100, { transform: normalizeMax });
  readonly pointSelected = output<ChartPointSelection>();

  protected readonly classes = computed(() =>
    [
      'chart',
      `chart--${this.size()}`,
      `chart--${this.variant()}`,
      `chart--${this.appearance()}`,
      this.loading() ? 'chart--loading' : '',
      this.interactive() ? 'chart--interactive' : '',
    ].join(' '),
  );

  protected readonly hasData = computed(() => this.data().some((series) => series.values.some((value) => Number.isFinite(value))));
  protected readonly ariaLabel = computed(() => this.title() || this.description() || 'Grafica de datos');
  protected readonly options = computed<EChartsCoreOption>(() => {
    switch (this.type()) {
      case 'pie':
      case 'donut':
        return this.circularOptions();
      case 'pareto':
        return this.paretoOptions();
      case 'radar':
        return this.radarOptions();
      case 'gauge':
        return this.gaugeOptions();
      default:
        return this.cartesianOptions();
    }
  });

  private cartesianOptions(): EChartsCoreOption {
    const minimal = this.appearance() === 'minimal';
    const horizontal = this.type() === 'horizontalBar';
    const bar = this.type() === 'bar' || this.type() === 'horizontalBar' || this.type() === 'stackedBar';

    return {
      color: this.seriesColors(),
      animationDuration: minimal ? 280 : 420,
      grid: this.gridOptions(minimal),
      tooltip: minimal ? undefined : { trigger: 'axis', confine: true },
      legend: minimal || this.data().length < 2 ? undefined : { bottom: 0, type: 'scroll' },
      xAxis: horizontal ? this.valueAxis(minimal) : this.categoryAxis(minimal, bar),
      yAxis: horizontal ? this.categoryAxis(minimal, true) : this.valueAxis(minimal),
      series: this.data().map((series) => ({
        name: series.name,
        type: bar ? 'bar' : 'line',
        data: series.values,
        smooth: !bar,
        symbol: minimal ? 'none' : 'circle',
        stack: this.type() === 'stackedBar' ? 'total' : undefined,
        areaStyle: this.type() === 'area' ? { opacity: minimal ? 0.12 : 0.18 } : undefined,
        emphasis: { focus: 'series' },
        barMaxWidth: bar ? 34 : undefined,
      })),
    };
  }

  private circularOptions(): EChartsCoreOption {
    const minimal = this.appearance() === 'minimal';
    const donut = this.type() === 'donut';
    const values = this.data()[0]?.values ?? [];

    return {
      color: this.seriesColors(),
      animationDuration: minimal ? 280 : 420,
      tooltip: { trigger: 'item', confine: true },
      legend: minimal ? undefined : { bottom: 0, type: 'scroll' },
      series: [
        {
          name: this.data()[0]?.name || this.title() || 'Datos',
          type: 'pie',
          radius: donut ? (minimal ? ['58%', '78%'] : ['48%', '72%']) : minimal ? '76%' : '68%',
          center: minimal ? ['50%', '50%'] : ['50%', '43%'],
          avoidLabelOverlap: true,
          label: { show: !minimal },
          data: values.map((value, index) => ({
            name: this.categories()[index] ?? `Dato ${index + 1}`,
            value,
          })),
        },
      ],
    };
  }

  private paretoOptions(): EChartsCoreOption {
    const minimal = this.appearance() === 'minimal';
    const values = this.data()[0]?.values ?? [];
    const sorted = values
      .map((value, index) => ({ name: this.categories()[index] ?? `Dato ${index + 1}`, value }))
      .filter((item) => Number.isFinite(item.value))
      .sort((left, right) => right.value - left.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);
    let running = 0;
    const cumulative = sorted.map((item) => {
      running += item.value;
      return total > 0 ? Math.round((running / total) * 1000) / 10 : 0;
    });

    return {
      color: this.seriesColors(),
      animationDuration: minimal ? 280 : 420,
      grid: this.gridOptions(minimal),
      tooltip: minimal ? undefined : { trigger: 'axis', confine: true },
      legend: minimal ? undefined : { bottom: 0 },
      xAxis: this.categoryAxis(minimal, true, sorted.map((item) => item.name)),
      yAxis: [
        this.valueAxis(minimal),
        {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { show: !minimal, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: this.data()[0]?.name || 'Valor',
          type: 'bar',
          data: sorted.map((item) => item.value),
          barMaxWidth: 34,
        },
        {
          name: 'Acumulado',
          type: 'line',
          yAxisIndex: 1,
          data: cumulative,
          smooth: true,
          symbol: minimal ? 'none' : 'circle',
        },
      ],
    };
  }

  private radarOptions(): EChartsCoreOption {
    const minimal = this.appearance() === 'minimal';

    return {
      color: this.seriesColors(),
      animationDuration: minimal ? 280 : 420,
      tooltip: minimal ? undefined : { confine: true },
      legend: minimal || this.data().length < 2 ? undefined : { bottom: 0, type: 'scroll' },
      radar: {
        radius: minimal ? '72%' : '62%',
        center: minimal ? ['50%', '50%'] : ['50%', '45%'],
        splitNumber: minimal ? 3 : 5,
        indicator: this.categories().map((category) => ({ name: category, max: this.max() })),
        axisName: { show: !minimal },
        splitLine: { show: !minimal },
        splitArea: { show: !minimal },
      },
      series: [
        {
          type: 'radar',
          data: this.data().map((series) => ({ name: series.name, value: series.values })),
          areaStyle: minimal ? { opacity: 0.08 } : undefined,
        },
      ],
    };
  }

  private gaugeOptions(): EChartsCoreOption {
    const minimal = this.appearance() === 'minimal';
    const value = this.firstFiniteValue();

    return {
      color: this.seriesColors(),
      animationDuration: minimal ? 280 : 420,
      series: [
        {
          name: this.data()[0]?.name || this.title() || 'Valor',
          type: 'gauge',
          min: 0,
          max: this.max(),
          radius: minimal ? '82%' : '78%',
          center: ['50%', minimal ? '54%' : '52%'],
          progress: { show: true, width: minimal ? 8 : 12 },
          axisLine: { lineStyle: { width: minimal ? 8 : 12 } },
          axisTick: { show: !minimal },
          splitLine: { show: !minimal },
          axisLabel: { show: !minimal },
          pointer: { show: !minimal },
          title: { show: !minimal },
          detail: {
            valueAnimation: true,
            formatter: '{value}',
            fontSize: minimal ? 18 : 24,
            offsetCenter: [0, minimal ? '8%' : '18%'],
          },
          data: [{ value, name: this.data()[0]?.name || this.title() || 'Valor' }],
        },
      ],
    };
  }

  private gridOptions(minimal: boolean): Record<string, number | boolean> {
    return {
      top: minimal ? 6 : 24,
      right: minimal ? 4 : 18,
      bottom: minimal ? 4 : 28,
      left: minimal ? 4 : 38,
      containLabel: !minimal,
    };
  }

  private categoryAxis(minimal: boolean, boundaryGap: boolean, data = this.categories()): Record<string, unknown> {
    return {
      type: 'category',
      data,
      boundaryGap,
      axisLine: { show: !minimal },
      axisTick: { show: !minimal },
      axisLabel: { show: !minimal },
    };
  }

  private valueAxis(minimal: boolean): Record<string, unknown> {
    return {
      type: 'value',
      splitLine: { show: !minimal, lineStyle: { color: '#e4e4e7' } },
      axisLabel: { show: !minimal },
    };
  }

  private firstFiniteValue(): number {
    return this.data()[0]?.values.find((value) => Number.isFinite(value)) ?? 0;
  }

  private seriesColors(): string[] {
    const explicit = this.data().map((series) => series.color).filter((color): color is string => Boolean(color));
    return explicit.length > 0 ? explicit : palettes[this.variant()];
  }

  protected handleChartClick(event: { componentType?: string; seriesName?: string; name?: string; value?: unknown }): void {
    const numericValue = typeof event.value === 'number' ? event.value : Number.NaN;
    if (!this.interactive() || event.componentType !== 'series' || !event.seriesName || !event.name || !Number.isFinite(numericValue)) {
      return;
    }

    this.pointSelected.emit({
      seriesName: event.seriesName,
      category: event.name,
      value: numericValue,
    });
  }
}

const normalizeMax = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isFinite(number) && number > 0 ? number : 100;
};

const palettes: Record<ChartVariant, string[]> = {
  primary: ['#0891b2', '#06b6d4', '#67e8f9', '#164e63'],
  secondary: ['#3f3f46', '#71717a', '#a1a1aa', '#27272a'],
  neutral: ['#52525b', '#71717a', '#d4d4d8', '#3f3f46'],
  danger: ['#b91c1c', '#ef4444', '#fca5a5', '#7f1d1d'],
  violet: ['#6d28d9', '#8b5cf6', '#c4b5fd', '#4c1d95'],
};
