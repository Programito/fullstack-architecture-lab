import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  afterEach(() => {
    document.querySelectorAll('app-tooltip-bubble').forEach((element) => element.remove());
  });

  it('shows text content on hover and hides on leave', async () => {
    await render('<button appTooltip="Guardar cambios" [tooltipShowDelay]="0" [tooltipHideDelay]="0">Guardar</button>', {
      imports: [Tooltip],
    });

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Guardar' }));

    expect((await screen.findByRole('tooltip')).textContent).toContain('Guardar cambios');

    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('shows on focus and hides on blur', async () => {
    await render('<button appTooltip="Ayuda" [tooltipShowDelay]="0" [tooltipHideDelay]="0">Info</button>', {
      imports: [Tooltip],
    });

    fireEvent.focusIn(screen.getByRole('button', { name: 'Info' }));

    expect((await screen.findByRole('tooltip')).textContent).toContain('Ayuda');

    fireEvent.focusOut(screen.getByRole('button', { name: 'Info' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('closes with Escape', async () => {
    await render('<button appTooltip="Ayuda" [tooltipShowDelay]="0">Info</button>', {
      imports: [Tooltip],
    });

    fireEvent.focusIn(screen.getByRole('button', { name: 'Info' }));
    expect(await screen.findByRole('tooltip')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('renders template content', async () => {
    await render(
      `
        <ng-template #tip><strong>Template rico</strong></ng-template>
        <button [appTooltip]="tip" [tooltipShowDelay]="0">Ver</button>
      `,
      {
        imports: [Tooltip],
      },
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Ver' }));

    expect(await screen.findByText('Template rico')).toBeTruthy();
  });

  it('does not show when disabled or content is empty', async () => {
    await render(
      `
        <button appTooltip="No aparece" tooltipDisabled [tooltipShowDelay]="0">Disabled</button>
        <button appTooltip="" [tooltipShowDelay]="0">Empty</button>
      `,
      {
        imports: [Tooltip],
      },
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Disabled' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Empty' }));

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('applies manual position class', async () => {
    await render('<button appTooltip="Derecha" tooltipPosition="right" [tooltipShowDelay]="0">Info</button>', {
      imports: [Tooltip],
    });

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Info' }));

    expect((await screen.findByRole('tooltip')).className).toContain('tooltip--right');
  });

  it('applies minimal appearance class', async () => {
    await render('<button appTooltip="Ayuda" tooltipAppearance="minimal" [tooltipShowDelay]="0">Info</button>', {
      imports: [Tooltip],
    });

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Info' }));

    expect((await screen.findByRole('tooltip')).className).toContain('tooltip--minimal');
  });

  it('adds aria-describedby while open and restores the previous value on close', async () => {
    await render(
      '<button aria-describedby="existing-help" appTooltip="Ayuda" [tooltipShowDelay]="0" [tooltipHideDelay]="0">Info</button>',
      {
        imports: [Tooltip],
      },
    );

    const trigger = screen.getByRole('button', { name: 'Info' });
    fireEvent.focusIn(trigger);

    const tooltip = await screen.findByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(`existing-help ${tooltip.id}`);

    fireEvent.focusOut(trigger);

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(trigger.getAttribute('aria-describedby')).toBe('existing-help');
  });
});
