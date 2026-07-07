import { render, screen } from '@testing-library/angular';
import { By } from '@angular/platform-browser';
import type { ComponentFixture } from '@angular/core/testing';
import { Chart, type ChartSeries } from './chart';

const categories = ['Ene', 'Feb', 'Mar'];
const data: ChartSeries[] = [{ name: 'Ingresos', values: [12, 18, 16] }];

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('Chart', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = TestResizeObserver;
  });

  it('renders title and description', async () => {
    await render('<app-chart title="Ingresos" description="Evolucion mensual" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    expect(screen.getByText('Ingresos')).toBeTruthy();
    expect(screen.getByText('Evolucion mensual')).toBeTruthy();
  });

  it('applies appearance, size and variant classes', async () => {
    const view = await render('<app-chart appearance="minimal" size="lg" variant="violet" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const host = view.fixture.nativeElement.querySelector('.chart') as HTMLElement;

    expect(host.classList.contains('chart--minimal')).toBe(true);
    expect(host.classList.contains('chart--lg')).toBe(true);
    expect(host.classList.contains('chart--violet')).toBe(true);
  });

  it('shows loading state', async () => {
    await render('<app-chart loading [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    expect(screen.getByRole('status', { name: 'Cargando grafica' })).toBeTruthy();
  });

  it('shows empty state without data', async () => {
    await render('<app-chart emptyTitle="Sin metricas" emptyDescription="Todavia no hay registros." />', {
      imports: [Chart],
    });

    expect(screen.getByText('Sin metricas')).toBeTruthy();
    expect(screen.getByText('Todavia no hay registros.')).toBeTruthy();
  });

  it('builds line options', async () => {
    const view = await render('<app-chart type="line" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string }> }>(view.fixture);

    expect(options.series[0].type).toBe('line');
  });

  it('builds bar options', async () => {
    const view = await render('<app-chart type="bar" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string }> }>(view.fixture);

    expect(options.series[0].type).toBe('bar');
  });

  it('builds area options', async () => {
    const view = await render('<app-chart type="area" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ areaStyle?: unknown }> }>(view.fixture);

    expect(options.series[0].areaStyle).toBeTruthy();
  });

  it('builds donut options', async () => {
    const view = await render('<app-chart type="donut" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string; radius: string[]; data: Array<{ name: string }> }> }>(view.fixture);

    expect(options.series[0].type).toBe('pie');
    expect(options.series[0].radius).toEqual(['48%', '72%']);
    expect(options.series[0].data[0].name).toBe('Ene');
  });

  it('keeps tooltip support for minimal donut charts', async () => {
    const view = await render('<app-chart type="donut" appearance="minimal" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ tooltip?: { trigger: string; confine?: boolean } }>(view.fixture);

    // `confine: true` keeps the tooltip within the chart's own bounds so it
    // repositions instead of being clipped by `.chart__body`'s `overflow: hidden`.
    expect(options.tooltip).toEqual({ trigger: 'item', confine: true });
  });

  it('builds pie options', async () => {
    const view = await render('<app-chart type="pie" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string; radius: string }> }>(view.fixture);

    expect(options.series[0].type).toBe('pie');
    expect(options.series[0].radius).toBe('68%');
  });

  it('builds horizontal bar options', async () => {
    const view = await render('<app-chart type="horizontalBar" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ xAxis: { type: string }; yAxis: { type: string }; series: Array<{ type: string }> }>(view.fixture);

    expect(options.xAxis.type).toBe('value');
    expect(options.yAxis.type).toBe('category');
    expect(options.series[0].type).toBe('bar');
  });

  it('builds stacked bar options', async () => {
    const view = await render('<app-chart type="stackedBar" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string; stack?: string }> }>(view.fixture);

    expect(options.series[0].type).toBe('bar');
    expect(options.series[0].stack).toBe('total');
  });

  it('builds pareto options', async () => {
    const view = await render('<app-chart type="pareto" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string; data: number[]; yAxisIndex?: number }> }>(view.fixture);

    expect(options.series[0].type).toBe('bar');
    expect(options.series[0].data).toEqual([18, 16, 12]);
    expect(options.series[1].type).toBe('line');
    expect(options.series[1].yAxisIndex).toBe(1);
  });

  it('builds radar options', async () => {
    const view = await render('<app-chart type="radar" [max]="50" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ radar: { indicator: Array<{ name: string; max: number }> }; series: Array<{ type: string }> }>(view.fixture);

    expect(options.radar.indicator[0]).toEqual({ name: 'Ene', max: 50 });
    expect(options.series[0].type).toBe('radar');
  });

  it('builds gauge options', async () => {
    const view = await render('<app-chart type="gauge" [max]="200" [data]="data" [categories]="categories" />', {
      imports: [Chart],
      componentProperties: { data, categories },
    });

    const options = chartOptions<{ series: Array<{ type: string; max: number; data: Array<{ value: number }> }> }>(view.fixture);

    expect(options.series[0].type).toBe('gauge');
    expect(options.series[0].max).toBe(200);
    expect(options.series[0].data[0].value).toBe(12);
  });
});

const chartOptions = <T>(fixture: ComponentFixture<unknown>): T => {
  const chart = fixture.debugElement.query(By.directive(Chart)).componentInstance as unknown as { options: () => T };
  return chart.options();
};
