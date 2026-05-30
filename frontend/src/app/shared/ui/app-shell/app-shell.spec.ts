import { fireEvent, render, screen } from '@testing-library/angular';
import { AppShell } from './app-shell';
import type { SideMenuGroup } from '../side-menu/side-menu';

const menuGroups: SideMenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'clients', label: 'Clientes', href: '#', icon: 'groups' },
    ],
  },
];

describe('AppShell', () => {
  it('composes navbar, side menu and content', async () => {
    await render('<app-app-shell brand="Producto" [menuGroups]="menuGroups" activeId="dashboard"><h1>Contenido</h1></app-app-shell>', {
      imports: [AppShell],
      componentProperties: { menuGroups },
    });

    expect(screen.getByRole('navigation', { name: 'Navegacion principal' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Navegacion lateral' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Contenido' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dashboard' }).getAttribute('aria-current')).toBe('page');
  });

  it('syncs menuCollapsed', async () => {
    const menuCollapsedChange = vi.fn();
    const { container } = await render(
      '<app-app-shell brand="Producto" [menuGroups]="menuGroups" (menuCollapsedChange)="menuCollapsedChange($event)" />',
      {
        imports: [AppShell],
        componentProperties: { menuGroups, menuCollapsedChange },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Contraer menu' }));

    expect(menuCollapsedChange).toHaveBeenCalledWith(true);
    expect(container.querySelector('.app-shell--menu-collapsed')).toBeTruthy();
  });

  it('re-emits menu item and brand events', async () => {
    const menuItemSelected = vi.fn();
    const brandSelected = vi.fn();

    await render(
      '<app-app-shell brand="Producto" [menuGroups]="menuGroups" (menuItemSelected)="menuItemSelected($event)" (brandSelected)="brandSelected()" />',
      {
        imports: [AppShell],
        componentProperties: { menuGroups, menuItemSelected, brandSelected },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Producto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));

    expect(brandSelected).toHaveBeenCalled();
    expect(menuItemSelected).toHaveBeenCalledWith(menuGroups[0].items[0]);
  });

  it('opens and closes mobile overlay controls', async () => {
    const { container } = await render('<app-app-shell brand="Producto" [menuGroups]="menuGroups" />', {
      imports: [AppShell],
      componentProperties: { menuGroups },
    });

    fireEvent.click(container.querySelector('[aria-label="Abrir menu"]') as HTMLElement);

    expect(container.querySelector('.app-shell--menu-open')).toBeTruthy();

    fireEvent.click(container.querySelector('[aria-label="Cerrar menu"]') as HTMLElement);

    expect(container.querySelector('.app-shell--menu-open')).toBeFalsy();
  });

  it('applies size, variant and appearance classes', async () => {
    const { container } = await render(
      '<app-app-shell brand="Producto" [menuGroups]="menuGroups" size="lg" variant="violet" appearance="minimal" />',
      {
        imports: [AppShell],
        componentProperties: { menuGroups },
      },
    );

    expect(container.querySelector('.app-shell--lg')).toBeTruthy();
    expect(container.querySelector('.app-shell--violet')).toBeTruthy();
    expect(container.querySelector('.app-shell--minimal')).toBeTruthy();
  });
});
