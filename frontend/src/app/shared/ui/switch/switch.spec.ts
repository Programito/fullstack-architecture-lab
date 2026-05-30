import { fireEvent, render, screen } from '@testing-library/angular';
import { Switch } from './switch';

describe('Switch', () => {
  it('renders a labelled switch', async () => {
    await render('<app-switch label="Notificaciones" />', {
      imports: [Switch],
    });

    expect(screen.getByRole('switch', { name: 'Notificaciones' })).toBeTruthy();
  });

  it('connects description through aria-describedby', async () => {
    await render('<app-switch label="Notificaciones" description="Texto de ayuda" />', {
      imports: [Switch],
    });

    const toggle = screen.getByRole('switch', { name: 'Notificaciones' });
    const description = screen.getByText('Texto de ayuda');

    expect(toggle.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('emits checked changes', async () => {
    const changed = vi.fn();

    await render('<app-switch label="Notificaciones" (checkedChange)="changed($event)" />', {
      imports: [Switch],
      componentProperties: {
        changed,
      },
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Notificaciones' }));

    expect(changed).toHaveBeenCalledWith(true);
  });

  it('applies variant, size and appearance classes', async () => {
    const { container } = await render('<app-switch label="Notificaciones" variant="violet" size="lg" appearance="minimal" />', {
      imports: [Switch],
    });

    const track = container.querySelector('.switch-field__track');
    expect(track?.className).toContain('switch-field__track--violet');
    expect(track?.className).toContain('switch-field__track--lg');
    expect(track?.className).toContain('switch-field__track--minimal');
  });
});
