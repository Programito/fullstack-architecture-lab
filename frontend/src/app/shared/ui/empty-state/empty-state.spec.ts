import { fireEvent, render, screen } from '@testing-library/angular';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title and description', async () => {
    await render('<app-empty-state title="Sin resultados" description="No hay datos para mostrar." />', {
      imports: [EmptyState],
    });

    expect(screen.getByText('Sin resultados')).toBeTruthy();
    expect(screen.getByText('No hay datos para mostrar.')).toBeTruthy();
  });

  it('emits primary and secondary actions', async () => {
    const action = vi.fn();
    const secondaryAction = vi.fn();

    await render(
      '<app-empty-state title="Vacio" actionLabel="Crear" secondaryActionLabel="Limpiar" (action)="action()" (secondaryAction)="secondaryAction()" />',
      {
        imports: [EmptyState],
        componentProperties: { action, secondaryAction },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(action).toHaveBeenCalled();
    expect(secondaryAction).toHaveBeenCalled();
  });

  it('applies size and appearance classes', async () => {
    const { container } = await render('<app-empty-state title="Vacio" size="lg" appearance="danger" />', {
      imports: [EmptyState],
    });

    expect(container.querySelector('.empty-state--lg')).toBeTruthy();
    expect(container.querySelector('.empty-state--danger')).toBeTruthy();
  });
});
