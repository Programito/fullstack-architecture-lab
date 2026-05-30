import { fireEvent, render, screen } from '@testing-library/angular';
import { Navbar } from './navbar';

describe('Navbar', () => {
  it('renders brand, navigation and projected slots', async () => {
    await render(`
      <app-navbar brand="Producto">
        <span navbar-center>Centro</span>
        <button navbar-actions type="button">Crear</button>
        <span navbar-user>AT</span>
      </app-navbar>
    `, {
      imports: [Navbar],
    });

    expect(screen.getByRole('navigation', { name: 'Navegacion principal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Producto' })).toBeTruthy();
    expect(screen.getByText('Centro')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeTruthy();
    expect(screen.getByText('AT')).toBeTruthy();
  });

  it('renders brand as a link when brandHref is present', async () => {
    await render('<app-navbar brand="Producto" brandHref="/inicio" />', {
      imports: [Navbar],
    });

    expect(screen.getByRole('link', { name: 'Producto' }).getAttribute('href')).toBe('/inicio');
  });

  it('emits brandSelected', async () => {
    const brandSelected = vi.fn();

    await render('<app-navbar brand="Producto" (brandSelected)="brandSelected()" />', {
      imports: [Navbar],
      componentProperties: { brandSelected },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Producto' }));

    expect(brandSelected).toHaveBeenCalled();
  });

  it('applies sticky, size, variant and appearance classes', async () => {
    const { container } = await render('<app-navbar brand="Producto" sticky size="lg" variant="violet" appearance="minimal" />', {
      imports: [Navbar],
    });

    expect(container.querySelector('.navbar--sticky')).toBeTruthy();
    expect(container.querySelector('.navbar--lg')).toBeTruthy();
    expect(container.querySelector('.navbar--violet')).toBeTruthy();
    expect(container.querySelector('.navbar--minimal')).toBeTruthy();
  });
});
