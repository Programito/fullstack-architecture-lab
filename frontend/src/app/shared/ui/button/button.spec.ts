import { render, screen } from '@testing-library/angular';
import { Button } from './button';

describe('Button', () => {
  it('renders projected content', async () => {
    await render('<app-button>Guardar</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('is disabled while loading', async () => {
    await render('<app-button loading>Guardando</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Guardando' })).toHaveProperty('disabled', true);
  });

  it('supports disabled state', async () => {
    await render('<app-button disabled>No disponible</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'No disponible' })).toHaveProperty('disabled', true);
  });

  it('supports full expansion', async () => {
    await render('<app-button expand="full">Continuar</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Continuar' }).className).toContain('w-full');
  });

  it('supports round shape', async () => {
    await render('<app-button shape="round">Continuar</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Continuar' }).className).toContain('rounded-full');
  });

  it('supports aria label', async () => {
    await render('<app-button ariaLabel="Crear elemento">+</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Crear elemento' })).toBeTruthy();
  });

  it('supports gradient fill', async () => {
    await render('<app-button fill="gradient">Crear con IA</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Crear con IA' }).className).toContain('button--gradient');
  });

  it('supports minimal appearance', async () => {
    await render('<app-button appearance="minimal">Ver detalles</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Ver detalles' }).className).toContain('button--minimal');
  });
});
