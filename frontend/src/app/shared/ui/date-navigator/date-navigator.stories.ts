import type { Meta, StoryObj } from '@storybook/angular';
import { DateNavigator } from './date-navigator';

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

type DateNavigatorStoryArgs = {
  value: string;
  showToday: boolean;
  prevLabel: string;
  nextLabel: string;
  todayLabel: string;
};

const meta: Meta<DateNavigatorStoryArgs> = {
  title: 'Shared UI/Date Navigator',
  component: DateNavigator,
  tags: ['autodocs'],
  args: {
    value: '2026-06-27',
    showToday: true,
    prevLabel: 'Día anterior',
    nextLabel: 'Día siguiente',
    todayLabel: 'Hoy',
  },
};

export default meta;

type Story = StoryObj<DateNavigatorStoryArgs>;

export const Default: Story = {};

export const TodayDate: Story = {
  args: {
    value: TODAY,
  },
};

export const NoDate: Story = {
  args: {
    value: '',
  },
};

export const WithoutToday: Story = {
  args: {
    showToday: false,
  },
};

export const CustomLabels: Story = {
  args: {
    prevLabel: 'Anterior',
    nextLabel: 'Siguiente',
    todayLabel: 'Ir a hoy',
    value: '2026-03-15',
  },
};

export const CompactRow: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-6 max-w-md">
        <app-date-navigator value="2026-06-27" />
        <app-date-navigator value="2026-06-27" [showToday]="false" />
        <app-date-navigator value="${TODAY}" />
      </div>
    `,
  }),
};
