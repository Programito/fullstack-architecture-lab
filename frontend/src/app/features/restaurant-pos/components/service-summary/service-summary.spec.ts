import { render, screen } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { ServiceSummary } from './service-summary';

describe('ServiceSummary', () => {
  it('renders the current shift metrics', async () => {
    const i18n = provideI18nTesting();

    await render(ServiceSummary, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        occupiedTables: 4,
        totalTables: 12,
        kitchenQueue: 3,
        salesToday: '245,00 EUR',
      },
    });

    expect(screen.getByLabelText('Resumen del turno')).toBeTruthy();
    expect(screen.getByText('4/12')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('245,00 EUR')).toBeTruthy();
  });
});
