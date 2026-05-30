import { fireEvent, render, screen } from '@testing-library/angular';
import { Chip } from './chip';

describe('Chip', () => {
  it('renders projected content', async () => {
    await render('<app-chip>Angular</app-chip>', {
      imports: [Chip],
    });

    expect(screen.getByRole('button', { name: 'Angular' })).toBeTruthy();
  });

  it('emits pressed when clicked', async () => {
    const pressed = vi.fn();

    await render('<app-chip (pressed)="pressed()">Angular</app-chip>', {
      imports: [Chip],
      componentProperties: {
        pressed,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Angular' }));

    expect(pressed).toHaveBeenCalledOnce();
  });

  it('emits removed when removable action is clicked', async () => {
    const removed = vi.fn();

    await render('<app-chip removable (removed)="removed()">Angular</app-chip>', {
      imports: [Chip],
      componentProperties: {
        removed,
      },
    });

    fireEvent.click(screen.getByLabelText('Quitar'));

    expect(removed).toHaveBeenCalledOnce();
  });

  it('supports selected state', async () => {
    await render('<app-chip selected>Angular</app-chip>', {
      imports: [Chip],
    });

    expect(screen.getByRole('button', { name: 'Angular' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('does not nest interactive controls when removable', async () => {
    await render('<app-chip removable>Angular</app-chip>', {
      imports: [Chip],
    });

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('supports minimal appearance', async () => {
    const { container } = await render('<app-chip appearance="minimal">Angular</app-chip>', {
      imports: [Chip],
    });

    expect(container.querySelector('.chip')?.className).toContain('chip--minimal');
  });
});
