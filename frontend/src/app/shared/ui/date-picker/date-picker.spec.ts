import { signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LocaleService } from '../../i18n/locale.service';
import type { AppLocale } from '../../i18n/locale.types';
import { DatePicker } from './date-picker';

class TestLocaleService {
  private readonly _locale = signal<AppLocale>('es');

  readonly locale = this._locale.asReadonly();

  setLocale(locale: AppLocale): void {
    this._locale.set(locale);
  }
}

const renderDatePicker = async (template: string, componentProperties: Record<string, unknown> = {}) =>
  render(template, {
    imports: [DatePicker],
    providers: [{ provide: LocaleService, useValue: new TestLocaleService() }],
    componentProperties,
  });

const openCalendar = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));
};

const getDay = (day: number) => screen.getByRole('gridcell', { name: new RegExp(`^${day} de mayo de 2026$`, 'i') });

describe('DatePicker', () => {
  it('renders a month and navigates between months', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-10" />');

    openCalendar();

    expect(screen.getByText('Mayo 2026')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    expect(screen.getByText('Junio 2026')).toBeTruthy();
  });

  it('selects a single date and closes the popover', async () => {
    const valueChange = vi.fn();

    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-10" (valueChange)="valueChange($event)" />', {
      valueChange,
    });

    openCalendar();
    fireEvent.click(getDay(15));

    expect(valueChange).toHaveBeenCalledWith('2026-05-15');
    expect(screen.queryByRole('dialog', { name: 'Fecha' })).toBeNull();
  });

  it('marks the selected single date', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-15" />');

    openCalendar();

    expect(getDay(15).className).toContain('date-picker__day--selected');
  });

  it('supports custom display date formats', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-15" dateFormat="dd/MM/yyyy" />');

    expect(screen.getByText('15/05/2026')).toBeTruthy();
  });

  it('supports sunday as the first day of the week', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-15" weekStartsOn="0" />');

    openCalendar();

    expect(screen.getAllByRole('gridcell')[0].getAttribute('aria-label')).toBe('26 de abril de 2026');
  });

  it('changes year and month from the compact month picker while preserving the selected day', async () => {
    const valueChange = vi.fn();

    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-15" (valueChange)="valueChange($event)" />', {
      valueChange,
    });

    openCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar mes y año' }));

    const yearInput = screen.getByLabelText('Año') as HTMLInputElement;

    expect(yearInput.value).toBe('2026');

    fireEvent.input(yearInput, { target: { value: '2030' } });
    fireEvent.keyDown(yearInput, { key: 'Enter' });
    fireEvent.click(screen.getByRole('gridcell', { name: 'Octubre 2030' }));

    expect(screen.getByText('Octubre 2030')).toBeTruthy();
    expect(screen.getByRole('gridcell', { name: '15 de octubre de 2030' }).className).toContain('date-picker__day--selected');
    expect(screen.getByText('15 oct 2030')).toBeTruthy();
    expect(valueChange).toHaveBeenCalledWith('2030-10-15');
  });

  it('selects a date range', async () => {
    const rangeChange = vi.fn();

    await renderDatePicker(
      '<app-date-picker mode="range" label="Fecha" startValue="2026-05-10" (rangeChange)="rangeChange($event)" />',
      { rangeChange },
    );

    openCalendar();
    fireEvent.click(getDay(10));
    fireEvent.click(getDay(15));

    expect(rangeChange).toHaveBeenLastCalledWith({ start: '2026-05-10', end: '2026-05-15' });
  });

  it('reorders a backwards date range', async () => {
    const rangeChange = vi.fn();

    await renderDatePicker(
      '<app-date-picker mode="range" label="Fecha" startValue="2026-05-15" (rangeChange)="rangeChange($event)" />',
      { rangeChange },
    );

    openCalendar();
    fireEvent.click(getDay(15));
    fireEvent.click(getDay(10));

    expect(rangeChange).toHaveBeenLastCalledWith({ start: '2026-05-10', end: '2026-05-15' });
  });

  it('marks range start, end, and intermediate days', async () => {
    await renderDatePicker('<app-date-picker mode="range" label="Fecha" startValue="2026-05-10" endValue="2026-05-15" />');

    openCalendar();

    expect(getDay(10).className).toContain('date-picker__day--range-start');
    expect(getDay(12).className).toContain('date-picker__day--in-range');
    expect(getDay(15).className).toContain('date-picker__day--range-end');
  });

  it('respects min, max, and disabled states', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-10" min="2026-05-10" max="2026-05-20" />');

    openCalendar();

    expect(getDay(9)).toHaveProperty('disabled', true);
    expect(getDay(21)).toHaveProperty('disabled', true);
  });

  it('does not open when disabled', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-10" disabled />');

    openCalendar();

    expect(screen.queryByRole('dialog', { name: 'Fecha' })).toBeNull();
  });

  it('closes with escape', async () => {
    await renderDatePicker('<app-date-picker label="Fecha" value="2026-05-10" />');

    openCalendar();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Fecha' })).toBeNull();
  });

  it('applies variant, fill, size, and appearance classes', async () => {
    const { container } = await renderDatePicker(
      '<app-date-picker label="Fecha" value="2026-05-10" variant="violet" fill="outline" size="lg" appearance="minimal" />',
    );

    const field = container.querySelector('.date-picker');

    expect(field?.className).toContain('date-picker--violet');
    expect(field?.className).toContain('date-picker--outline');
    expect(field?.className).toContain('date-picker--lg');
    expect(field?.className).toContain('date-picker--minimal');
  });
});
