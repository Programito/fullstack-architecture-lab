import { fireEvent, render, screen } from '@testing-library/angular';
import { FloatingActionMenu, type FloatingActionMenuAction } from './floating-action-menu';

const actions: FloatingActionMenuAction[] = [
  { id: 'task', icon: 'checklist', label: 'Nueva tarea' },
  { id: 'project', icon: 'folder', label: 'Nuevo proyecto' },
  { id: 'invite', icon: 'person_add', label: 'Invitar usuario', variant: 'violet' },
];

describe('FloatingActionMenu', () => {
  it('renders the main FAB with an accessible name', async () => {
    await render('<app-floating-action-menu label="Crear" [actions]="actions" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions },
    });

    expect(screen.getByRole('button', { name: 'Crear' })).toBeTruthy();
  });

  it('opens and closes when the main FAB is clicked', async () => {
    await render('<app-floating-action-menu label="Crear" [actions]="actions" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions },
    });

    const trigger = screen.getByRole('button', { name: 'Crear' });

    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Nueva tarea' })).toBeTruthy();

    fireEvent.click(trigger);

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('applies position, direction, size and variant classes', async () => {
    const { container } = await render(
      '<app-floating-action-menu label="Crear" position="bottom-right" direction="left" size="lg" variant="violet" [actions]="actions" />',
      {
        imports: [FloatingActionMenu],
        componentProperties: { actions },
      },
    );

    const menu = container.querySelector('.floating-action-menu') as HTMLElement;

    expect(menu.classList.contains('floating-action-menu--bottom-right')).toBe(true);
    expect(menu.classList.contains('floating-action-menu--left')).toBe(true);
    expect(menu.classList.contains('floating-action-menu--lg')).toBe(true);
    expect(menu.classList.contains('floating-action-menu--violet')).toBe(true);
  });

  it('renders actions only when open', async () => {
    await render('<app-floating-action-menu label="Crear" [actions]="actions" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions },
    });

    expect(screen.queryByRole('menuitem', { name: 'Nueva tarea' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByRole('menuitem', { name: 'Nueva tarea' })).toBeTruthy();
  });

  it('emits the pressed action and closes the menu', async () => {
    const actionPressed = vi.fn();

    await render('<app-floating-action-menu label="Crear" open [actions]="actions" (actionPressed)="actionPressed($event)" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions, actionPressed },
    });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Nueva tarea' }));

    expect(actionPressed).toHaveBeenCalledWith(actions[0]);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not emit disabled actions', async () => {
    const actionPressed = vi.fn();
    const disabledActions: FloatingActionMenuAction[] = [
      { id: 'archive', icon: 'archive', label: 'Archivar', disabled: true },
    ];

    await render('<app-floating-action-menu label="Crear" open [actions]="actions" (actionPressed)="actionPressed($event)" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions: disabledActions, actionPressed },
    });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Archivar' }));

    expect(actionPressed).not.toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    await render('<app-floating-action-menu label="Crear" open [actions]="actions" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions },
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('sets aria-expanded on the main FAB', async () => {
    await render('<app-floating-action-menu label="Crear" [actions]="actions" />', {
      imports: [FloatingActionMenu],
      componentProperties: { actions },
    });

    const trigger = screen.getByRole('button', { name: 'Crear' });

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});
