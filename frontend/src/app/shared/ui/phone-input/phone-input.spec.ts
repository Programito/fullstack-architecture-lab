import { signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { PhoneInput, type PhoneCountryCode } from './phone-input';

describe('PhoneInput', () => {
  it('renders a labelled phone input with hint text', async () => {
    await render('<app-phone-input id="phone-field" label="Movil" hint="Incluye prefijo internacional" />', {
      imports: [PhoneInput],
    });

    const input = screen.getByLabelText('Movil');

    expect(input.getAttribute('id')).toBe('phone-field');
    expect(input.getAttribute('type')).toBe('tel');
    expect(input.getAttribute('autocomplete')).toBe('tel');
    expect(input.getAttribute('aria-describedby')).toBe('phone-field-hint');
    expect(screen.getByText('Incluye prefijo internacional').getAttribute('id')).toBe('phone-field-hint');
  });

  it('renders error state', async () => {
    await render('<app-phone-input label="Movil" error="Introduce un movil valido" />', {
      imports: [PhoneInput],
    });

    const input = screen.getByLabelText('Movil');

    expect(screen.getByText('Introduce un movil valido')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('supports signal two-way binding for value and country', async () => {
    const phone = signal('');
    const phoneCountry = signal<PhoneCountryCode>('ES');

    await render('<app-phone-input label="Movil" [(value)]="phone" [(country)]="phoneCountry" />', {
      imports: [PhoneInput],
      componentProperties: {
        phone,
        phoneCountry,
      },
    });

    fireEvent.input(screen.getByLabelText('Movil'), { target: { value: '612345678' } });

    expect(phone()).toBe('+34612345678');
    expect(phoneCountry()).toBe('ES');
  });

  it('emits an E.164 value when typing a valid Spanish mobile phone', async () => {
    const changed = vi.fn();

    await render('<app-phone-input label="Movil" (valueChange)="changed($event)" />', {
      imports: [PhoneInput],
      componentProperties: {
        changed,
      },
    });

    fireEvent.input(screen.getByLabelText('Movil'), { target: { value: '612345678' } });

    expect(changed).toHaveBeenCalledWith('+34612345678');
  });

  it('changes country from the integrated selector', async () => {
    const countryChanged = vi.fn();

    await render('<app-phone-input label="Movil" (countryChange)="countryChanged($event)" />', {
      imports: [PhoneInput],
      componentProperties: {
        countryChanged,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Pais del telefono/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Portugal +351' }));

    expect(countryChanged).toHaveBeenCalledWith('PT');
    expect(screen.getByRole('button', { name: /Portugal \+351/i })).toBeTruthy();
  });

  it('disables both the country selector and native input', async () => {
    await render('<app-phone-input label="Movil" disabled />', {
      imports: [PhoneInput],
    });

    expect((screen.getByLabelText('Movil') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Pais del telefono/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('marks readonly controls without opening the selector', async () => {
    await render('<app-phone-input label="Movil" readonly />', {
      imports: [PhoneInput],
    });

    const countryButton = screen.getByRole('button', { name: /Pais del telefono/i }) as HTMLButtonElement;

    expect((screen.getByLabelText('Movil') as HTMLInputElement).readOnly).toBe(true);
    expect(countryButton.disabled).toBe(true);
  });

  it('applies fill, variant, appearance and size classes', async () => {
    const { container } = await render(
      '<app-phone-input label="Movil" fill="outline" variant="violet" appearance="minimal" size="lg" />',
      {
        imports: [PhoneInput],
      },
    );

    const field = container.querySelector('.phone-input');

    expect(field?.className).toContain('phone-input--outline');
    expect(field?.className).toContain('phone-input--violet');
    expect(field?.className).toContain('phone-input--minimal');
    expect(field?.className).toContain('phone-input--lg');
  });

  it('uses a hidden input for native form submission', async () => {
    const { container } = await render('<app-phone-input label="Movil" name="mobile" value="+34612345678" />', {
      imports: [PhoneInput],
    });

    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;

    expect(hidden.name).toBe('mobile');
    expect(hidden.value).toBe('+34612345678');
  });
});
