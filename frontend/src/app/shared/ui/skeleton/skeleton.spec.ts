import { render, screen } from '@testing-library/angular';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a loading status by default', async () => {
    await render('<app-skeleton ariaLabel="Cargando datos" />', {
      imports: [Skeleton],
    });

    expect(screen.getByRole('status', { name: 'Cargando datos' })).toBeTruthy();
  });

  it('can be decorative', async () => {
    const { container } = await render('<app-skeleton decorative />', {
      imports: [Skeleton],
    });

    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton?.getAttribute('role')).toBeNull();
  });

  it('applies shape, animation, tone and appearance classes', async () => {
    const { container } = await render('<app-skeleton shape="text" animation="wave" tone="strong" appearance="minimal" />', {
      imports: [Skeleton],
    });

    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.className).toContain('skeleton--text');
    expect(skeleton?.className).toContain('skeleton--wave');
    expect(skeleton?.className).toContain('skeleton--strong');
    expect(skeleton?.className).toContain('skeleton--minimal');
  });

  it('applies custom dimensions', async () => {
    const { container } = await render('<app-skeleton width="12rem" height="3rem" />', {
      imports: [Skeleton],
    });

    const skeleton = container.querySelector('.skeleton') as HTMLElement | null;
    expect(skeleton?.style.width).toBe('12rem');
    expect(skeleton?.style.height).toBe('3rem');
  });
});
