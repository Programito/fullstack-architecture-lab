import { fireEvent, render, screen } from '@testing-library/angular';
import { SideMenu, type SideMenuGroup } from './side-menu';

const groups: SideMenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'clients', label: 'Clientes', href: '#', icon: 'groups', badge: '12' },
      { id: 'settings', label: 'Ajustes', icon: 'settings', disabled: true },
    ],
  },
];

describe('SideMenu', () => {
  it('renders groups and items', async () => {
    await render('<app-side-menu [groups]="groups" />', {
      imports: [SideMenu],
      componentProperties: { groups },
    });

    expect(screen.getByRole('navigation', { name: 'Navegacion lateral' })).toBeTruthy();
    expect(screen.getByText('Principal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Clientes/i })).toBeTruthy();
  });

  it('marks active item with aria-current', async () => {
    await render('<app-side-menu [groups]="groups" activeId="clients" />', {
      imports: [SideMenu],
      componentProperties: { groups },
    });

    expect(screen.getByRole('link', { name: /Clientes/i }).getAttribute('aria-current')).toBe('page');
  });

  it('emits itemSelected and activeIdChange', async () => {
    const itemSelected = vi.fn();
    const activeIdChange = vi.fn();

    await render('<app-side-menu [groups]="groups" (itemSelected)="itemSelected($event)" (activeIdChange)="activeIdChange($event)" />', {
      imports: [SideMenu],
      componentProperties: { groups, itemSelected, activeIdChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));

    expect(itemSelected).toHaveBeenCalledWith(groups[0].items[0]);
    expect(activeIdChange).toHaveBeenCalledWith('dashboard');
  });

  it('collapses and expands', async () => {
    const collapsedChange = vi.fn();
    const { container } = await render('<app-side-menu [groups]="groups" (collapsedChange)="collapsedChange($event)" />', {
      imports: [SideMenu],
      componentProperties: { groups, collapsedChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Contraer menu' }));

    expect(collapsedChange).toHaveBeenCalledWith(true);
    expect(container.querySelector('.side-menu--collapsed')).toBeTruthy();
  });

  it('does not interact with disabled items', async () => {
    const itemSelected = vi.fn();

    await render('<app-side-menu [groups]="groups" (itemSelected)="itemSelected($event)" />', {
      imports: [SideMenu],
      componentProperties: { groups, itemSelected },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));

    expect(itemSelected).not.toHaveBeenCalled();
  });

  it('applies sticky, size, variant and appearance classes', async () => {
    const { container } = await render('<app-side-menu [groups]="groups" size="lg" variant="violet" appearance="minimal" sticky />', {
      imports: [SideMenu],
      componentProperties: { groups },
    });

    expect(container.querySelector('.side-menu--sticky')).toBeTruthy();
    expect(container.querySelector('.side-menu--lg')).toBeTruthy();
    expect(container.querySelector('.side-menu--violet')).toBeTruthy();
    expect(container.querySelector('.side-menu--minimal')).toBeTruthy();
  });
});
