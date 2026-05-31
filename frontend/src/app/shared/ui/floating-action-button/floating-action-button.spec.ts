import { fireEvent, render, screen } from '@testing-library/angular';
import { FloatingActionButton } from './floating-action-button';

describe('FloatingActionButton', () => {
  it('renders as a button with an accessible name', async () => {
    await render('<app-floating-action-button label="Crear" />', {
      imports: [FloatingActionButton],
    });

    expect(screen.getByRole('button', { name: 'Crear' })).toBeTruthy();
  });

  it('emits pressed on click', async () => {
    const pressed = vi.fn();

    await render('<app-floating-action-button label="Crear" (pressed)="pressed()" />', {
      imports: [FloatingActionButton],
      componentProperties: { pressed },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(pressed).toHaveBeenCalled();
  });

  it('does not emit when disabled', async () => {
    const pressed = vi.fn();

    await render('<app-floating-action-button label="Crear" disabled (pressed)="pressed()" />', {
      imports: [FloatingActionButton],
      componentProperties: { pressed },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(pressed).not.toHaveBeenCalled();
  });

  it('does not emit while loading', async () => {
    const pressed = vi.fn();

    await render('<app-floating-action-button label="Crear" loading (pressed)="pressed()" />', {
      imports: [FloatingActionButton],
      componentProperties: { pressed },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(pressed).not.toHaveBeenCalled();
  });

  it('applies size, variant, position and extended classes', async () => {
    const { container } = await render('<app-floating-action-button label="Crear" size="lg" variant="violet" position="bottom-right" extended />', {
      imports: [FloatingActionButton],
    });

    const button = container.querySelector('.floating-action-button') as HTMLElement;

    expect(button.classList.contains('floating-action-button--lg')).toBe(true);
    expect(button.classList.contains('floating-action-button--violet')).toBe(true);
    expect(button.classList.contains('floating-action-button--bottom-right')).toBe(true);
    expect(button.classList.contains('floating-action-button--extended')).toBe(true);
  });

  it('hides visible label when icon-only', async () => {
    await render('<app-floating-action-button label="Crear" />', {
      imports: [FloatingActionButton],
    });

    expect(screen.queryByText('Crear')).toBeNull();
  });

  it('shows visible label when extended', async () => {
    await render('<app-floating-action-button label="Crear" extended />', {
      imports: [FloatingActionButton],
    });

    expect(screen.getByText('Crear')).toBeTruthy();
  });

  it('sets aria-busy while loading', async () => {
    await render('<app-floating-action-button label="Crear" loading />', {
      imports: [FloatingActionButton],
    });

    expect(screen.getByRole('button', { name: 'Crear' }).getAttribute('aria-busy')).toBe('true');
  });
});
