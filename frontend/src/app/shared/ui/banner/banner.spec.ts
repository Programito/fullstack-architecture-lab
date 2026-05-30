import { fireEvent, render, screen } from '@testing-library/angular';
import { Banner } from './banner';

describe('Banner', () => {
  it('renders eyebrow, title, description, and projected content', async () => {
    await render(
      '<app-banner eyebrow="Nuevo" title="Automatiza" description="Configura reglas">Contenido extra</app-banner>',
      {
        imports: [Banner],
      },
    );

    expect(screen.getByText('Nuevo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Automatiza' })).toBeTruthy();
    expect(screen.getByText('Configura reglas')).toBeTruthy();
    expect(screen.getByText('Contenido extra')).toBeTruthy();
  });

  it('does not render action buttons without labels', async () => {
    await render('<app-banner title="Sin acciones" />', {
      imports: [Banner],
    });

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('emits action when the primary CTA is clicked', async () => {
    const action = vi.fn();

    await render('<app-banner title="Accion" actionLabel="Continuar" (action)="action()" />', {
      imports: [Banner],
      componentProperties: { action },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(action).toHaveBeenCalledOnce();
  });

  it('emits secondaryAction when the secondary CTA is clicked', async () => {
    const secondaryAction = vi.fn();

    await render('<app-banner title="Accion" secondaryActionLabel="Detalles" (secondaryAction)="secondaryAction()" />', {
      imports: [Banner],
      componentProperties: { secondaryAction },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Detalles' }));

    expect(secondaryAction).toHaveBeenCalledOnce();
  });

  it('emits dismissed and uses dismissAriaLabel when dismissible', async () => {
    const dismissed = vi.fn();

    await render('<app-banner title="Cerrable" dismissible dismissAriaLabel="Cerrar aviso" (dismissed)="dismissed()" />', {
      imports: [Banner],
      componentProperties: { dismissed },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('applies variant, fill, size and appearance classes', async () => {
    const { container } = await render(
      '<app-banner title="Estilo" variant="violet" fill="gradient" size="lg" appearance="minimal" />',
      {
        imports: [Banner],
      },
    );

    const banner = container.querySelector('.banner');

    expect(banner?.className).toContain('banner--violet');
    expect(banner?.className).toContain('banner--gradient');
    expect(banner?.className).toContain('banner--lg');
    expect(banner?.className).toContain('banner--minimal');
  });
});
