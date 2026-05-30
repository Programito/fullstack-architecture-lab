import { render, screen } from '@testing-library/angular';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('renders an accessible loading status by default', async () => {
    await render('<app-spinner label="Cargando datos" />', {
      imports: [Spinner],
    });

    expect(screen.getByRole('status', { name: 'Cargando datos' })).toBeTruthy();
  });

  it('can be decorative', async () => {
    const { container } = await render('<app-spinner decorative />', {
      imports: [Spinner],
    });

    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('.spinner')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies size, type, variant and appearance classes', async () => {
    const { container } = await render('<app-spinner size="lg" type="bars" variant="danger" appearance="minimal" />', {
      imports: [Spinner],
    });

    const spinner = container.querySelector('.spinner');
    expect(spinner?.className).toContain('spinner--lg');
    expect(spinner?.className).toContain('spinner--bars');
    expect(spinner?.className).toContain('spinner--danger');
    expect(spinner?.className).toContain('spinner--minimal');
  });

  it('renders visible text next to the indicator', async () => {
    await render('<app-spinner text="Cargando datos" />', {
      imports: [Spinner],
    });

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Cargando datos')).toBeTruthy();
  });

  it('supports text on the left', async () => {
    const { container } = await render('<app-spinner text="Sincronizando" textPosition="left" />', {
      imports: [Spinner],
    });

    expect(container.querySelector('.spinner')?.className).toContain('spinner--text-left');
    expect(container.querySelector('.spinner__text')?.textContent).toBe('Sincronizando');
  });
});
