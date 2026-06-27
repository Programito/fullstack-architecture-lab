import { signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LocaleService } from '../../i18n/locale.service';
import type { AppLocale } from '../../i18n/locale.types';
import { DateNavigator } from './date-navigator';

class TestLocaleService {
  private readonly _locale = signal<AppLocale>('es');
  readonly locale = this._locale.asReadonly();
  setLocale(locale: AppLocale): void {
    this._locale.set(locale);
  }
}

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const renderNavigator = (value = TODAY, extraProps: Record<string, unknown> = {}) =>
  render(
    '<app-date-navigator [value]="value" [showToday]="showToday" (valueChange)="onChange($event)" />',
    {
      imports: [DateNavigator],
      providers: [{ provide: LocaleService, useValue: new TestLocaleService() }],
      componentProperties: { value, showToday: true, onChange: vi.fn(), ...extraProps },
    },
  );

describe('DateNavigator', () => {
  it('renders previous and next day navigation buttons', async () => {
    await renderNavigator();

    expect(screen.getByRole('button', { name: 'Día anterior' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeTruthy();
  });

  it('previous day button emits the day before the current value', async () => {
    const onChange = vi.fn();
    await renderNavigator('2026-06-27', { onChange });

    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));

    expect(onChange).toHaveBeenCalledWith('2026-06-26');
  });

  it('next day button emits the day after the current value', async () => {
    const onChange = vi.fn();
    await renderNavigator('2026-06-27', { onChange });

    fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));

    expect(onChange).toHaveBeenCalledWith('2026-06-28');
  });

  it('hides the today button when value is today', async () => {
    await renderNavigator(TODAY);

    expect(screen.queryByRole('button', { name: 'Hoy' })).toBeNull();
  });

  it('shows the today button when value is not today', async () => {
    await renderNavigator('2026-01-01');

    expect(screen.getByRole('button', { name: 'Hoy' })).toBeTruthy();
  });

  it('today button emits today ISO date', async () => {
    const onChange = vi.fn();
    await renderNavigator('2026-01-01', { onChange });

    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(onChange).toHaveBeenCalledWith(TODAY);
  });

  it('hides the today button when showToday is false', async () => {
    await renderNavigator('2026-01-01', { showToday: false });

    expect(screen.queryByRole('button', { name: 'Hoy' })).toBeNull();
  });

  it('accepts custom labels for navigation buttons', async () => {
    await render(
      '<app-date-navigator [value]="value" prevLabel="Anterior" nextLabel="Siguiente" />',
      {
        imports: [DateNavigator],
        providers: [{ provide: LocaleService, useValue: new TestLocaleService() }],
        componentProperties: { value: TODAY },
      },
    );

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
  });
});
