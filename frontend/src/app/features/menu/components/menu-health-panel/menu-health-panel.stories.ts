import type { Meta, StoryObj } from '@storybook/angular';
import { MenuHealthPanel } from './menu-health-panel';
import type { MenuAuditCounter, MenuAuditFilter } from '../../models/menu-audit.model';

type Args = {
  counters: readonly MenuAuditCounter[];
  selectedFilter: MenuAuditFilter;
};

const sampleCounters: MenuAuditCounter[] = [
  { type: 'missing-image', count: 12, priority: 'high', exampleProductName: 'Hamburguesa craft' },
  { type: 'missing-description', count: 7, priority: 'medium', exampleProductName: 'Ensalada César' },
  { type: 'weak-combo-summary', count: 4, priority: 'medium', exampleProductName: 'Menú del día' },
  { type: 'unavailable', count: 3, priority: 'low', exampleProductName: 'Tarta de queso' },
  { type: 'missing-section', count: 1, priority: 'low', exampleProductName: 'Agua con gas' },
];

const meta: Meta<Args> = {
  title: 'Menu/Menu Health Panel',
  component: MenuHealthPanel,
  tags: ['autodocs'],
  args: {
    counters: sampleCounters,
    selectedFilter: 'all',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-2xl">
        <app-menu-health-panel [counters]="counters" [selectedFilter]="selectedFilter" />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    counters: [],
  },
};

export const WithSelectedFilter: Story = {
  args: {
    selectedFilter: 'missing-image',
  },
};

export const SingleWarning: Story = {
  args: {
    counters: [sampleCounters[0]],
  },
};

export const LocaleEnglish: Story = {
  name: 'Locale: English',
  globals: { locale: 'en' },
};

export const LocaleCatalan: Story = {
  name: 'Locale: Català',
  globals: { locale: 'ca' },
};
