import { Router } from '@angular/router';
import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { ToastService } from '../../../../shared/ui/toast/toast';
import { MenuApiService } from '../../services/menu-api.service';
import { TaxRatesPage } from './tax-rates-page';

const TAX_RATES = [
  { id: 'tax-1', name: 'IVA General', ratePercent: 21, isActive: true },
  { id: 'tax-2', name: 'IVA Reducido', ratePercent: 10, isActive: true },
];

describe('TaxRatesPage', () => {
  const listTaxRates = vi.fn();
  const createTaxRate = vi.fn();
  const updateTaxRate = vi.fn();
  const deleteTaxRate = vi.fn();
  const navigateByUrl = vi.fn(async () => true);
  const toastDanger = vi.fn();

  const renderPage = async (lang: 'es' | 'en' | 'ca' = 'es') => {
    const i18n = provideI18nTesting(lang);
    return render(TaxRatesPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: Router, useValue: { navigateByUrl } },
        { provide: MenuApiService, useValue: { listTaxRates, createTaxRate, updateTaxRate, deleteTaxRate } },
        { provide: ToastService, useValue: { danger: toastDanger, success: vi.fn() } },
      ],
    });
  };

  beforeEach(() => {
    listTaxRates.mockReset().mockReturnValue(of(TAX_RATES));
    createTaxRate.mockReset();
    updateTaxRate.mockReset();
    deleteTaxRate.mockReset();
    navigateByUrl.mockClear();
    toastDanger.mockClear();
  });

  it('renders the existing tax rates', async () => {
    await renderPage();

    expect(await screen.findByText('IVA General')).toBeTruthy();
    expect(screen.getByText('21%')).toBeTruthy();
    expect(screen.getByText('IVA Reducido')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();
  });

  it('shows an empty state when there are no tax rates', async () => {
    listTaxRates.mockReturnValue(of([]));
    await renderPage();

    expect(await screen.findByText(/Todavía no hay tipos de IVA/i)).toBeTruthy();
  });

  it('creates a new tax rate from the form dialog', async () => {
    createTaxRate.mockReturnValue(of({ id: 'tax-3', name: 'IVA Superreducido', ratePercent: 4, isActive: true }));
    await renderPage();
    await screen.findByText('IVA General');

    fireEvent.click(screen.getByRole('button', { name: /Añadir tipo de IVA/i }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Nombre' }), { target: { value: 'IVA Superreducido' } });
    fireEvent.input(screen.getByRole('spinbutton', { name: 'Porcentaje' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(createTaxRate).toHaveBeenCalledWith({ name: 'IVA Superreducido', ratePercent: 4 }));
    expect(await screen.findByText('IVA Superreducido')).toBeTruthy();
  });

  it('deletes a tax rate after confirming', async () => {
    deleteTaxRate.mockReturnValue(of(undefined));
    await renderPage();
    await screen.findByText('IVA General');

    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar tipo de IVA' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));

    await waitFor(() => expect(deleteTaxRate).toHaveBeenCalledWith('tax-1'));
  });

  it('shows an error toast when deleting a tax rate assigned to products fails', async () => {
    deleteTaxRate.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Tax rate is in use.', code: 'tax_rate_in_use' } })),
    );
    await renderPage();
    await screen.findByText('IVA General');

    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar tipo de IVA' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));

    await waitFor(() => expect(toastDanger).toHaveBeenCalled());
  });

  it('navigates back to the menu', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Volver a la carta/i }));
    expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu');
  });
});
