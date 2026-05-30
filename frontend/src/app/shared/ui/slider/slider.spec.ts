import { fireEvent, render, screen } from '@testing-library/angular';
import { Slider, type SliderOption } from './slider';

const stringOptions: SliderOption[] = [
  { label: 'Bajo', value: 'low' },
  { label: 'Medio', value: 'medium' },
  { label: 'Alto', value: 'high' },
];

const numberOptions: SliderOption[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
];

describe('Slider', () => {
  it('renders label, hint, marks, selected value, and aria-valuetext', async () => {
    await render('<app-slider label="Intensidad" hint="Texto de ayuda" value="medium" [options]="options" />', {
      imports: [Slider],
      componentProperties: {
        options: stringOptions,
      },
    });

    const slider = screen.getByRole('slider', { name: 'Intensidad' });
    const hint = screen.getByText('Texto de ayuda');

    expect(slider).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBe('Medio');
    expect(slider.getAttribute('aria-describedby')).toBe(hint.id);
    expect(screen.getByText('Bajo')).toBeTruthy();
    expect(screen.getAllByText('Medio')).toHaveLength(2);
    expect(screen.getByText('Alto')).toBeTruthy();
  });

  it('emits the string option value instead of the internal index', async () => {
    const changed = vi.fn();

    await render('<app-slider label="Intensidad" value="medium" [options]="options" (valueChange)="changed($event)" />', {
      imports: [Slider],
      componentProperties: {
        options: stringOptions,
        changed,
      },
    });

    fireEvent.input(screen.getByRole('slider', { name: 'Intensidad' }), { target: { value: '2' } });

    expect(changed).toHaveBeenCalledWith('high');
  });

  it('supports numeric option values', async () => {
    const changed = vi.fn();

    await render('<app-slider label="Prioridad" [value]="3" [options]="options" (valueChange)="changed($event)" />', {
      imports: [Slider],
      componentProperties: {
        options: numberOptions,
        changed,
      },
    });

    const slider = screen.getByRole('slider', { name: 'Prioridad' }) as HTMLInputElement;

    expect(slider.value).toBe('2');
    expect(slider.getAttribute('aria-valuetext')).toBe('3');

    fireEvent.input(slider, { target: { value: '4' } });

    expect(changed).toHaveBeenCalledWith(5);
  });

  it('falls back to the first option visually when value does not match', async () => {
    await render('<app-slider label="Intensidad" value="missing" [options]="options" />', {
      imports: [Slider],
      componentProperties: {
        options: stringOptions,
      },
    });

    const slider = screen.getByRole('slider', { name: 'Intensidad' }) as HTMLInputElement;

    expect(slider.value).toBe('0');
    expect(slider.getAttribute('aria-valuetext')).toBe('Bajo');
  });

  it('applies variant, size, minimal appearance, and error state classes', async () => {
    const { container } = await render(
      '<app-slider label="Intensidad" value="medium" variant="violet" size="lg" appearance="minimal" error="Selecciona una opcion" [options]="options" />',
      {
        imports: [Slider],
        componentProperties: {
          options: stringOptions,
        },
      },
    );

    const field = container.querySelector('.slider-field');
    const slider = screen.getByRole('slider', { name: 'Intensidad' });

    expect(field?.className).toContain('slider-field--violet');
    expect(field?.className).toContain('slider-field--lg');
    expect(field?.className).toContain('slider-field--minimal');
    expect(field?.className).toContain('slider-field--error');
    expect(slider.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Selecciona una opcion')).toBeTruthy();
  });

  it('supports disabled state and hidden form value', async () => {
    const { container } = await render(
      '<app-slider label="Intensidad" name="intensity" value="high" disabled [options]="options" />',
      {
        imports: [Slider],
        componentProperties: {
          options: stringOptions,
        },
      },
    );

    const slider = screen.getByRole('slider', { name: 'Intensidad' }) as HTMLInputElement;
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;

    expect(slider.disabled).toBe(true);
    expect(hidden.name).toBe('intensity');
    expect(hidden.value).toBe('high');
  });

  it('can hide marks and value text', async () => {
    await render('<app-slider label="Intensidad" value="medium" [options]="options" [showMarks]="false" [showValue]="false" />', {
      imports: [Slider],
      componentProperties: {
        options: stringOptions,
      },
    });

    expect(screen.queryByText('Bajo')).toBeNull();
    expect(screen.queryByText('Medio')).toBeNull();
    expect(screen.queryByText('Alto')).toBeNull();
  });
});
