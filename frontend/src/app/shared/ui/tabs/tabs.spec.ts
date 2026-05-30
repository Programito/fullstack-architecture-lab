import { fireEvent, render, screen } from '@testing-library/angular';
import { Tabs, type TabsOption } from './tabs';

const options: TabsOption[] = [
  { label: 'Resumen', value: 'summary' },
  { label: 'Actividad', value: 'activity' },
  { label: 'Ajustes', value: 'settings' },
];

describe('Tabs', () => {
  it('renders tabs and a tabpanel', async () => {
    await render('<app-tabs [options]="options" value="summary">Contenido</app-tabs>', {
      imports: [Tabs],
      componentProperties: { options },
    });

    expect(screen.getByRole('tablist')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Resumen' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('Contenido');
  });

  it('emits valueChange when selecting a tab', async () => {
    const valueChange = vi.fn();

    await render('<app-tabs [options]="options" value="summary" (valueChange)="valueChange($event)" />', {
      imports: [Tabs],
      componentProperties: { options, valueChange },
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Actividad' }));

    expect(valueChange).toHaveBeenCalledWith('activity');
  });

  it('does not emit for disabled tabs', async () => {
    const valueChange = vi.fn();
    const disabledOptions = [{ label: 'Resumen', value: 'summary' }, { label: 'Actividad', value: 'activity', disabled: true }];

    await render('<app-tabs [options]="options" value="summary" (valueChange)="valueChange($event)" />', {
      imports: [Tabs],
      componentProperties: { options: disabledOptions, valueChange },
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Actividad' }));

    expect(valueChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation', async () => {
    const valueChange = vi.fn();

    await render('<app-tabs [options]="options" value="summary" (valueChange)="valueChange($event)" />', {
      imports: [Tabs],
      componentProperties: { options, valueChange },
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumen' }), { key: 'ArrowRight' });

    expect(valueChange).toHaveBeenCalledWith('activity');
  });

  it('skips disabled tabs during keyboard navigation', async () => {
    const valueChange = vi.fn();
    const disabledOptions = [
      { label: 'Resumen', value: 'summary' },
      { label: 'Actividad', value: 'activity', disabled: true },
      { label: 'Ajustes', value: 'settings' },
    ];

    await render('<app-tabs [options]="options" value="summary" (valueChange)="valueChange($event)" />', {
      imports: [Tabs],
      componentProperties: { options: disabledOptions, valueChange },
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumen' }), { key: 'ArrowRight' });

    expect(valueChange).toHaveBeenCalledWith('settings');
  });

  it('applies pill and large classes', async () => {
    await render('<app-tabs [options]="options" value="summary" variant="pill" size="lg" />', {
      imports: [Tabs],
      componentProperties: { options },
    });

    expect(screen.getByRole('tablist').className).toContain('tabs__list--pill');
    expect(screen.getByRole('tablist').className).toContain('tabs__list--lg');
  });

  it('applies minimal appearance class', async () => {
    await render('<app-tabs [options]="options" value="summary" appearance="minimal" />', {
      imports: [Tabs],
      componentProperties: { options },
    });

    expect(screen.getByRole('tablist').className).toContain('tabs__list--minimal');
  });
});
