import { fireEvent, render, screen } from '@testing-library/angular';
import { RadioGroup, type RadioGroupOption } from './radio-group';

describe('RadioGroup', () => {
  const options: RadioGroupOption[] = [
    { label: 'Email', value: 'email', description: 'Recibe novedades por correo.' },
    { label: 'Push', value: 'push', description: 'Recibe alertas inmediatas.' },
    { label: 'Digest', value: 'digest', disabled: true },
  ];

  it('renders a labelled radio group with options and descriptions', async () => {
    await render('<app-radio-group label="Canal" [options]="options" value="email" />', {
      imports: [RadioGroup],
      componentProperties: { options },
    });

    expect(screen.getByRole('group', { name: 'Canal' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Email/ })).toBeTruthy();
    expect(screen.getByText('Recibe novedades por correo.')).toBeTruthy();
  });

  it('connects hint through aria-describedby', async () => {
    await render('<app-radio-group label="Canal" hint="Texto de ayuda" [options]="options" value="email" />', {
      imports: [RadioGroup],
      componentProperties: { options },
    });

    const group = screen.getByRole('group', { name: 'Canal' });
    const hint = screen.getByText('Texto de ayuda');

    expect(group.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('connects error through aria-describedby and marks radios invalid', async () => {
    await render('<app-radio-group label="Canal" error="Selecciona una opcion" [options]="options" />', {
      imports: [RadioGroup],
      componentProperties: { options },
    });

    const group = screen.getByRole('group', { name: 'Canal' });
    const error = screen.getByText('Selecciona una opcion');

    expect(group.getAttribute('aria-describedby')).toBe(error.id);
    expect(screen.getByRole('radio', { name: /Email/ }).getAttribute('aria-invalid')).toBe('true');
  });

  it('emits valueChange when a different enabled option is selected', async () => {
    const valueChange = vi.fn();

    await render('<app-radio-group label="Canal" [options]="options" value="email" (valueChange)="valueChange($event)" />', {
      imports: [RadioGroup],
      componentProperties: { options, valueChange },
    });

    fireEvent.click(screen.getByRole('radio', { name: /Push/ }));

    expect(valueChange).toHaveBeenCalledWith('push');
  });

  it('does not emit for selected, disabled option, or disabled group', async () => {
    const valueChange = vi.fn();

    const { rerender } = await render(
      '<app-radio-group label="Canal" [options]="options" [disabled]="disabled" value="email" (valueChange)="valueChange($event)" />',
      {
        imports: [RadioGroup],
        componentProperties: { options, valueChange, disabled: false },
      },
    );

    fireEvent.click(screen.getByRole('radio', { name: /Email/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Digest' }));

    await rerender({ componentProperties: { options, valueChange, disabled: true } });
    fireEvent.click(screen.getByRole('radio', { name: /Push/ }));

    expect(valueChange).not.toHaveBeenCalled();
  });

  it('updates the selected option when the parent updates value', async () => {
    await render('<app-radio-group label="Canal" [options]="options" [value]="value" (valueChange)="value = $event" />', {
      imports: [RadioGroup],
      componentProperties: { options, value: 'email' },
    });

    fireEvent.click(screen.getByRole('radio', { name: /Push/ }));

    expect(screen.getByRole('radio', { name: /Email/ })).toHaveProperty('checked', false);
    expect(screen.getByRole('radio', { name: /Push/ })).toHaveProperty('checked', true);
  });

  it('applies variant, size, layout, and selected classes', async () => {
    const { container } = await render(
      '<app-radio-group label="Canal" [options]="options" value="push" variant="violet" size="lg" layout="horizontal" appearance="minimal" />',
      {
        imports: [RadioGroup],
        componentProperties: { options },
      },
    );

    const group = container.querySelector('.radio-group');
    const selectedOption = container.querySelector('.radio-group__option--selected');

    expect(group?.className).toContain('radio-group--violet');
    expect(group?.className).toContain('radio-group--lg');
    expect(group?.className).toContain('radio-group--horizontal');
    expect(group?.className).toContain('radio-group--minimal');
    expect(selectedOption?.textContent).toContain('Push');
  });
});
