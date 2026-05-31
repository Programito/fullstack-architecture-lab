import type { Meta, StoryObj } from '@storybook/angular';
import { Chart, type ChartAppearance, type ChartSeries, type ChartSize, type ChartType, type ChartVariant } from './chart';

type ChartStoryArgs = {
  type: ChartType;
  appearance: ChartAppearance;
  size: ChartSize;
  variant: ChartVariant;
  data: ChartSeries[];
  categories: string[];
  title: string;
  description: string;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  max: number;
};

const categories = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
const revenue: ChartSeries[] = [{ name: 'Ingresos', values: [12, 18, 16, 24, 29, 34] }];
const comparison: ChartSeries[] = [
  { name: 'Ingresos', values: [12, 18, 16, 24, 29, 34] },
  { name: 'Gastos', values: [8, 11, 13, 15, 17, 19] },
];
const channels: ChartSeries[] = [{ name: 'Canales', values: [38, 26, 18, 12, 6] }];
const channelCategories = ['Directo', 'Organic', 'Paid', 'Referral', 'Email'];
const quality: ChartSeries[] = [
  { name: 'Actual', values: [82, 74, 91, 68, 77] },
  { name: 'Objetivo', values: [90, 85, 95, 80, 88] },
];
const qualityCategories = ['Velocidad', 'Calidad', 'Soporte', 'Coste', 'Entrega'];
const gaugeData: ChartSeries[] = [{ name: 'Salud', values: [72] }];

const meta: Meta<ChartStoryArgs> = {
  title: 'Shared UI/Chart',
  component: Chart,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['line', 'bar', 'horizontalBar', 'stackedBar', 'area', 'pie', 'donut', 'pareto', 'radar', 'gauge'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
  },
  args: {
    type: 'line',
    appearance: 'default',
    size: 'md',
    variant: 'primary',
    data: revenue,
    categories,
    title: 'Ingresos',
    description: 'Evolucion mensual del periodo activo.',
    loading: false,
    emptyTitle: 'Sin datos',
    emptyDescription: 'No hay datos para mostrar en esta grafica.',
    max: 100,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-2xl">
        <app-chart
          [type]="type"
          [appearance]="appearance"
          [size]="size"
          [variant]="variant"
          [data]="data"
          [categories]="categories"
          [title]="title"
          [description]="description"
          [loading]="loading"
          [emptyTitle]="emptyTitle"
          [emptyDescription]="emptyDescription"
          [max]="max"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ChartStoryArgs>;

export const LineDefault: Story = {};
export const BarDefault: Story = { args: { type: 'bar', data: comparison, title: 'Comparativa mensual' } };
export const HorizontalBarDefault: Story = { args: { type: 'horizontalBar', data: revenue, title: 'Ranking mensual' } };
export const StackedBarDefault: Story = { args: { type: 'stackedBar', data: comparison, title: 'Distribucion mensual' } };
export const AreaDefault: Story = { args: { type: 'area', data: comparison, title: 'Tendencia acumulada' } };
export const PieDefault: Story = {
  args: {
    type: 'pie',
    data: channels,
    categories: channelCategories,
    title: 'Canales',
    description: 'Distribucion por origen de trafico.',
  },
};
export const DonutDefault: Story = {
  args: {
    type: 'donut',
    data: channels,
    categories: channelCategories,
    title: 'Canales',
    description: 'Distribucion por origen de trafico.',
  },
};
export const ParetoDefault: Story = {
  args: {
    type: 'pareto',
    data: channels,
    categories: channelCategories,
    title: 'Causas principales',
    description: 'Barras ordenadas y porcentaje acumulado.',
  },
};
export const RadarDefault: Story = {
  args: {
    type: 'radar',
    data: quality,
    categories: qualityCategories,
    title: 'Perfil de servicio',
    description: 'Comparacion por dimensiones.',
    max: 100,
  },
};
export const GaugeDefault: Story = {
  args: {
    type: 'gauge',
    data: gaugeData,
    categories: ['Salud'],
    title: 'Salud operativa',
    description: 'Score actual sobre el maximo definido.',
    max: 100,
  },
};
export const MinimalLine: Story = {
  args: {
    appearance: 'minimal',
    size: 'sm',
    title: 'Actividad',
    description: '',
  },
};
export const MinimalGauge: Story = {
  args: {
    type: 'gauge',
    appearance: 'minimal',
    size: 'sm',
    data: gaugeData,
    categories: ['Salud'],
    title: 'Salud',
    description: '',
    max: 100,
  },
};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { data: [], categories: [], title: 'Ingresos' } };
export const Variants: Story = {
  render: () => ({
    props: { categories, revenue },
    template: `
      <div class="grid max-w-5xl gap-4 md:grid-cols-2">
        <app-chart title="Primary" variant="primary" [data]="revenue" [categories]="categories" />
        <app-chart title="Secondary" variant="secondary" [data]="revenue" [categories]="categories" />
        <app-chart title="Neutral" variant="neutral" [data]="revenue" [categories]="categories" />
        <app-chart title="Danger" variant="danger" [data]="revenue" [categories]="categories" />
        <app-chart title="Violet" variant="violet" [data]="revenue" [categories]="categories" />
      </div>
    `,
  }),
};
export const Sizes: Story = {
  render: () => ({
    props: { categories, revenue },
    template: `
      <div class="grid max-w-3xl gap-4">
        <app-chart title="Pequeno" size="sm" [data]="revenue" [categories]="categories" />
        <app-chart title="Mediano" size="md" [data]="revenue" [categories]="categories" />
        <app-chart title="Grande" size="lg" [data]="revenue" [categories]="categories" />
      </div>
    `,
  }),
};
