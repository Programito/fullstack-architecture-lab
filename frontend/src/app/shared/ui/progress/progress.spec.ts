import { render, screen } from '@testing-library/angular';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders label and value', async () => {
    await render('<app-progress label="Carga" [value]="50" showValue />', {
      imports: [Progress],
    });

    expect(screen.getByText('Carga')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('sets progressbar aria attributes', async () => {
    await render('<app-progress label="Carga" [value]="25" [max]="50" />', {
      imports: [Progress],
    });

    const progress = screen.getByRole('progressbar', { name: 'Carga' });

    expect(progress.getAttribute('aria-valuemin')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('50');
    expect(progress.getAttribute('aria-valuenow')).toBe('25');
  });

  it('omits numeric aria values when indeterminate', async () => {
    await render('<app-progress label="Procesando" indeterminate />', {
      imports: [Progress],
    });

    const progress = screen.getByRole('progressbar', { name: 'Procesando' });

    expect(progress.getAttribute('aria-valuenow')).toBeNull();
    expect(progress.getAttribute('aria-valuetext')).toBe('En progreso');
  });
});
