import { fireEvent, render, screen } from '@testing-library/angular';
import { SegmentedControl } from './segmented-control';

describe('SegmentedControl', () => {
  const options = [
    { label: 'Resumen', value: 'summary' },
    { label: 'Actividad', value: 'activity' },
  ];

  it('renders options with radio semantics', async () => {
    await render('<app-segmented-control [options]="options" value="summary" />', {
      imports: [SegmentedControl],
      componentProperties: { options },
    });

    expect(screen.getByRole('radio', { name: 'Resumen' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Actividad' }).getAttribute('aria-checked')).toBe('false');
  });

  it('emits valueChange when an option is selected', async () => {
    const valueChange = vi.fn();

    await render('<app-segmented-control [options]="options" value="summary" (valueChange)="valueChange($event)" />', {
      imports: [SegmentedControl],
      componentProperties: { options, valueChange },
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Actividad' }));

    expect(valueChange).toHaveBeenCalledWith('activity');
  });

  it('updates the active option when the parent updates value', async () => {
    await render('<app-segmented-control [options]="options" [value]="value" (valueChange)="value = $event" />', {
      imports: [SegmentedControl],
      componentProperties: { options, value: 'summary' },
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Actividad' }));

    expect(screen.getByRole('radio', { name: 'Resumen' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Actividad' }).getAttribute('aria-checked')).toBe('true');
  });

  it('supports underline variant', async () => {
    await render('<app-segmented-control [options]="options" value="summary" variant="underline" appearance="minimal" />', {
      imports: [SegmentedControl],
      componentProperties: { options },
    });

    expect(screen.getByRole('radiogroup').className).toContain('segmented-control--underline');
    expect(screen.getByRole('radiogroup').className).toContain('segmented-control--minimal');
  });
});
