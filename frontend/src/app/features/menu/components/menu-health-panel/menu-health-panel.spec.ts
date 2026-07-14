import { render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { MenuHealthPanel } from './menu-health-panel';

describe('MenuHealthPanel', () => {
  it('renders warning counts and labels', async () => {
    const i18n = provideI18nTesting('es');

    await render(MenuHealthPanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      componentInputs: {
        counters: [
          { type: 'missing-image', count: 4, priority: 'high', exampleProductName: 'Croquetas de jamón ibérico' },
          { type: 'missing-description', count: 2, priority: 'high', exampleProductName: 'Agua mineral' },
        ],
        selectedFilter: 'all',
      },
    });

    expect(screen.getByText('Revisión rápida del menú')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sin imagen/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sin descripción/i })).toBeTruthy();
    expect(screen.getByText(/Croquetas de jamón ibérico/i)).toBeTruthy();
  });

  it('emits the selected quick filter', async () => {
    const i18n = provideI18nTesting('es');
    const filterSelected = vi.fn();

    await render('<app-menu-health-panel [counters]="counters" [selectedFilter]="selectedFilter" (filterSelected)="filterSelected($event)" />', {
      imports: [...i18n.imports, MenuHealthPanel],
      providers: [...i18n.providers],
      componentProperties: {
        counters: [{ type: 'missing-section', count: 1, priority: 'high', exampleProductName: 'Agua mineral' }],
        selectedFilter: 'all',
        filterSelected,
      },
    });

    screen.getByRole('button', { name: /Sin sección del menú/i }).click();

    expect(filterSelected).toHaveBeenCalledWith('missing-section');
  });
});
