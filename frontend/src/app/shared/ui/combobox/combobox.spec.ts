import { fireEvent, render, screen } from '@testing-library/angular';
import { Component, signal } from '@angular/core';
import { Combobox, type ComboboxOption } from './combobox';

const options: ComboboxOption[] = [
  { label: 'Producto', value: 'product', description: 'Ventas' },
  { label: 'Soporte', value: 'support', description: 'Ayuda' },
  { label: 'Archivado', value: 'archived', disabled: true },
];

describe('Combobox', () => {
  it('filters options while typing', async () => {
    await render('<app-combobox label="Categoria" [options]="options" />', {
      imports: [Combobox],
      componentProperties: { options },
    });

    fireEvent.input(screen.getByRole('combobox', { name: 'Categoria' }), { target: { value: 'sop' } });

    expect(screen.getByRole('option', { name: /Soporte/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Producto/i })).toBeNull();
  });

  it('selects an option with click', async () => {
    const valueChange = vi.fn();

    await render('<app-combobox label="Categoria" [options]="options" (valueChange)="valueChange($event)" />', {
      imports: [Combobox],
      componentProperties: { options, valueChange },
    });

    fireEvent.focus(screen.getByRole('combobox', { name: 'Categoria' }));
    fireEvent.click(screen.getByRole('option', { name: /Soporte/i }));

    expect(valueChange).toHaveBeenCalledWith('support');
    expect((screen.getByRole('combobox', { name: 'Categoria' }) as HTMLInputElement).value).toBe('Soporte');
  });

  it('selects an option with keyboard', async () => {
    const valueChange = vi.fn();

    await render('<app-combobox label="Categoria" [options]="options" (valueChange)="valueChange($event)" />', {
      imports: [Combobox],
      componentProperties: { options, valueChange },
    });

    const input = screen.getByRole('combobox', { name: 'Categoria' });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(valueChange).toHaveBeenCalledWith('support');
  });

  it('clears the selected value', async () => {
    const valueChange = vi.fn();

    await render('<app-combobox label="Categoria" value="product" [options]="options" (valueChange)="valueChange($event)" />', {
      imports: [Combobox],
      componentProperties: { options, valueChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar seleccion' }));

    expect(valueChange).toHaveBeenCalledWith('');
  });

  it('clears the visible label when parent state resets the selected value', async () => {
    @Component({
      selector: 'app-combobox-host',
      imports: [Combobox],
      template: `
        <app-combobox label="Categoria" [options]="options" [value]="value()" (valueChange)="value.set($event)" />
        <button type="button" (click)="value.set('')">Reset</button>
      `,
    })
    class HostComponent {
      readonly options = options;
      readonly value = signal('product');
    }

    await render(HostComponent);

    const input = screen.getByRole('combobox', { name: 'Categoria' }) as HTMLInputElement;
    expect(input.value).toBe('Producto');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(input.value).toBe('');
  });

  it('sets combobox aria attributes', async () => {
    await render('<app-combobox label="Categoria" hint="Elige una" [options]="options" />', {
      imports: [Combobox],
      componentProperties: { options },
    });

    const input = screen.getByRole('combobox', { name: 'Categoria' });

    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-controls')).toContain('combobox-');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
  });
});
