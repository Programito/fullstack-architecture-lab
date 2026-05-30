import { render, screen } from '@testing-library/angular';
import { Icon } from './icon';

describe('Icon', () => {
  it('renders the icon name', async () => {
    await render('<app-icon name="expand_more" />', {
      imports: [Icon],
    });

    expect(screen.getByText('expand_more')).toBeTruthy();
  });

  it('applies size class', async () => {
    const { container } = await render('<app-icon name="check" size="lg" />', {
      imports: [Icon],
    });

    expect(container.querySelector('.icon')?.className).toContain('icon--lg');
  });

  it('hides decorative icons from assistive technologies', async () => {
    const { container } = await render('<app-icon name="close" />', {
      imports: [Icon],
    });

    expect(container.querySelector('.icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.icon')?.getAttribute('role')).toBeNull();
  });

  it('labels non-decorative icons', async () => {
    await render('<app-icon name="upload_file" [decorative]="false" ariaLabel="Subir archivo" />', {
      imports: [Icon],
    });

    expect(screen.getByRole('img', { name: 'Subir archivo' })).toBeTruthy();
  });
});
