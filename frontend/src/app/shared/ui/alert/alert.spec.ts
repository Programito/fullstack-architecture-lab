import { fireEvent, render, screen } from '@testing-library/angular';
import { Alert } from './alert';

describe('Alert', () => {
  it('renders title and description', async () => {
    await render('<app-alert title="Cambios guardados" description="La configuracion se actualizo." />', {
      imports: [Alert],
    });

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Cambios guardados')).toBeTruthy();
    expect(screen.getByText('La configuracion se actualizo.')).toBeTruthy();
  });

  it('applies variant, fill, size and appearance classes', async () => {
    const { container } = await render(
      '<app-alert variant="danger" fill="outline" size="lg" appearance="minimal" title="Error" />',
      {
        imports: [Alert],
      },
    );

    const alert = container.querySelector('.alert');
    expect(alert?.className).toContain('alert--danger');
    expect(alert?.className).toContain('alert--outline');
    expect(alert?.className).toContain('alert--lg');
    expect(alert?.className).toContain('alert--minimal');
  });

  it('emits dismiss events', async () => {
    const dismissed = vi.fn();

    await render('<app-alert title="Aviso" dismissible (dismissed)="dismissed()" />', {
      imports: [Alert],
      componentProperties: {
        dismissed,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar alerta' }));

    expect(dismissed).toHaveBeenCalled();
  });

  it('can render without landmark role', async () => {
    const { container } = await render('<app-alert role="note" title="Nota" />', {
      imports: [Alert],
    });

    expect(container.querySelector('.alert')?.getAttribute('role')).toBeNull();
  });
});
