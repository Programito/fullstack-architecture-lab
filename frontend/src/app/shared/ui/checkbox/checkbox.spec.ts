import { fireEvent, render, screen } from '@testing-library/angular';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders a labelled checkbox', async () => {
    await render('<app-checkbox label="Aceptar condiciones" />', {
      imports: [Checkbox],
    });

    expect(screen.getByLabelText('Aceptar condiciones')).toBeTruthy();
  });

  it('connects description through aria-describedby', async () => {
    await render('<app-checkbox label="Aceptar" description="Texto de ayuda" />', {
      imports: [Checkbox],
    });

    const checkbox = screen.getByLabelText('Aceptar');
    const description = screen.getByText('Texto de ayuda');

    expect(checkbox.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('emits checked changes', async () => {
    const changed = vi.fn();

    await render('<app-checkbox label="Aceptar" (checkedChange)="changed($event)" />', {
      imports: [Checkbox],
      componentProperties: {
        changed,
      },
    });

    fireEvent.click(screen.getByLabelText('Aceptar'));

    expect(changed).toHaveBeenCalledWith(true);
  });

  it('applies variant, size and appearance classes', async () => {
    const { container } = await render('<app-checkbox label="Aceptar" variant="violet" size="lg" appearance="minimal" />', {
      imports: [Checkbox],
    });

    const box = container.querySelector('.checkbox-field__box');
    expect(box?.className).toContain('checkbox-field__box--violet');
    expect(box?.className).toContain('checkbox-field__box--lg');
    expect(box?.className).toContain('checkbox-field__box--minimal');
  });

  it('keeps checked styles reachable from the current markup', async () => {
    const { container } = await render('<app-checkbox checked label="Aceptar" />', {
      imports: [Checkbox],
    });

    expect(container.querySelector('.checkbox-field__input:checked + .checkbox-field__body .checkbox-field__icon')).toBeTruthy();
  });

  it('keeps indeterminate styles reachable from the current markup', async () => {
    const { container } = await render('<app-checkbox indeterminate label="Aceptar" />', {
      imports: [Checkbox],
    });

    const checkbox = screen.getByLabelText('Aceptar');
    expect(checkbox.className).toContain('checkbox-field__input--indeterminate');
    expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
    expect(
      container.querySelector('.checkbox-field__input--indeterminate + .checkbox-field__body .checkbox-field__icon'),
    ).toBeTruthy();
  });
});
