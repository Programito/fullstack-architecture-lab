import { fireEvent, render, screen, within } from '@testing-library/angular';
import { TimePicker } from './time-picker';

describe('TimePicker', () => {
  it('renders a labelled time picker', async () => {
    await render('<app-time-picker label="Hora" />', {
      imports: [TimePicker],
    });

    expect(screen.getByLabelText('Hora')).toBeTruthy();
  });

  it('uses a custom id when provided', async () => {
    await render('<app-time-picker id="starts-at" label="Hora" hint="Selecciona una hora disponible" />', {
      imports: [TimePicker],
    });

    const input = screen.getByLabelText('Hora');
    expect(input.getAttribute('id')).toBe('starts-at');
    expect(input.getAttribute('aria-describedby')).toBe('starts-at-hint');
    expect(screen.getByText('Selecciona una hora disponible').getAttribute('id')).toBe('starts-at-hint');
  });

  it('opens hour and minute options using the configured minute step', async () => {
    await render('<app-time-picker label="Hora" minuteStep="30" />', {
      imports: [TimePicker],
    });

    fireEvent.focus(screen.getByLabelText('Hora'));

    const minutes = within(screen.getByRole('group', { name: 'Minutos disponibles' }));

    expect(screen.getByRole('dialog', { name: 'Hora' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '09' })).toBeTruthy();
    expect(minutes.getByRole('button', { name: '30' })).toBeTruthy();
    expect(minutes.queryByRole('button', { name: '15' })).toBeNull();
  });

  it('selects a time from hour and minute columns', async () => {
    const valueChange = vi.fn();

    await render('<app-time-picker label="Hora" minuteStep="30" (valueChange)="valueChange($event)" />', {
      imports: [TimePicker],
      componentProperties: {
        valueChange,
      },
    });

    const input = screen.getByLabelText('Hora') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole('button', { name: '09' }));
    fireEvent.click(screen.getByRole('button', { name: '30' }));

    expect(valueChange).toHaveBeenLastCalledWith('09:30');
    expect(input.value).toBe('09:30');
  });

  it('allows typing a custom minute outside the configured step', async () => {
    const valueChange = vi.fn();

    await render('<app-time-picker label="Hora" minuteStep="15" (valueChange)="valueChange($event)" />', {
      imports: [TimePicker],
      componentProperties: {
        valueChange,
      },
    });

    const input = screen.getByLabelText('Hora') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '14:37' } });
    fireEvent.blur(input);

    expect(valueChange).toHaveBeenLastCalledWith('14:37');
    expect(input.value).toBe('14:37');
  });

  it('respects min, max, and disabled states', async () => {
    await render('<app-time-picker label="Hora" minuteStep="30" min="09:00" max="10:00" />', {
      imports: [TimePicker],
    });

    fireEvent.focus(screen.getByLabelText('Hora'));

    expect(screen.getByRole('button', { name: '08' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: '09' })).toHaveProperty('disabled', false);

    fireEvent.click(screen.getByRole('button', { name: '10' }));

    expect(screen.getByRole('button', { name: '30' })).toHaveProperty('disabled', true);
  });

  it('renders error state', async () => {
    await render('<app-time-picker label="Hora" error="Selecciona una hora valida" />', {
      imports: [TimePicker],
    });

    const trigger = screen.getByLabelText('Hora');
    expect(screen.getByText('Selecciona una hora valida')).toBeTruthy();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not open when disabled', async () => {
    await render('<app-time-picker label="Hora" disabled />', {
      imports: [TimePicker],
    });

    fireEvent.focus(screen.getByLabelText('Hora'));

    expect(screen.queryByRole('dialog', { name: 'Hora' })).toBeNull();
  });

  it('applies variant, fill, size, and appearance classes', async () => {
    const { container } = await render('<app-time-picker label="Hora" variant="violet" fill="outline" size="lg" appearance="minimal" />', {
      imports: [TimePicker],
    });

    const field = container.querySelector('.time-picker');
    expect(field?.className).toContain('time-picker--violet');
    expect(field?.className).toContain('time-picker--outline');
    expect(field?.className).toContain('time-picker--lg');
    expect(field?.className).toContain('time-picker--minimal');
  });
});
