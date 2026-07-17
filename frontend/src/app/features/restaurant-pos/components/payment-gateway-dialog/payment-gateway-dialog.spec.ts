import { render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { PaymentGatewayDialog } from './payment-gateway-dialog';

describe('PaymentGatewayDialog', () => {
  it('places cancel on the left and accept on the right of the footer actions', async () => {
    const i18n = provideI18nTesting();

    await render(PaymentGatewayDialog, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        open: true,
        total: '26,90 €',
        tableTitle: 'Mesa 10',
        statusLabel: 'Conectando con terminal...',
        rejected: false,
      },
    });

    const footer = screen.getByTestId('payment-gateway-footer');
    const actionLabels = within(footer)
      .getAllByRole('button')
      .map((button) => button.textContent?.replace(/\s+/g, ' ').trim());

    expect(actionLabels).toEqual(['Cancelar', 'Error', 'Aceptar pago']);
  });
});
