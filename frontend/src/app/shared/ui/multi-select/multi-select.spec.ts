import { fireEvent, render, screen } from '@testing-library/angular';
import { MultiSelect, type MultiSelectOption } from './multi-select';

const options: MultiSelectOption[] = [
  { label: 'Angular', value: 'angular' },
  { label: 'Tailwind', value: 'tailwind' },
  { label: 'Legacy', value: 'legacy', disabled: true },
];

describe('MultiSelect', () => {
  it('adds and removes options', async () => {
    const valueChange = vi.fn();

    await render('<app-multi-select label="Tecnologias" [options]="options" (valueChange)="valueChange($event)" />', {
      imports: [MultiSelect],
      componentProperties: { options, valueChange },
    });

    fireEvent.focus(screen.getByRole('combobox', { name: 'Tecnologias' }));
    fireEvent.click(screen.getByRole('option', { name: 'Angular' }));

    expect(valueChange).toHaveBeenCalledWith(['angular']);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Angular' }));

    expect(valueChange).toHaveBeenCalledWith([]);
  });

  it('respects maxSelected', async () => {
    await render('<app-multi-select label="Tecnologias" [options]="options" [value]="value" [maxSelected]="1" />', {
      imports: [MultiSelect],
      componentProperties: { options, value: ['angular'] },
    });

    fireEvent.focus(screen.getByRole('combobox', { name: 'Tecnologias' }));

    expect((screen.getByRole('option', { name: 'Tailwind' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not select disabled options', async () => {
    const valueChange = vi.fn();

    await render('<app-multi-select label="Tecnologias" [options]="options" (valueChange)="valueChange($event)" />', {
      imports: [MultiSelect],
      componentProperties: { options, valueChange },
    });

    fireEvent.focus(screen.getByRole('combobox', { name: 'Tecnologias' }));
    fireEvent.click(screen.getByRole('option', { name: 'Legacy' }));

    expect(valueChange).not.toHaveBeenCalled();
  });

  it('connects hint and error aria state', async () => {
    await render('<app-multi-select label="Tecnologias" hint="Ayuda" error="Error" [options]="options" />', {
      imports: [MultiSelect],
      componentProperties: { options },
    });

    const input = screen.getByRole('combobox', { name: 'Tecnologias' });

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('-error');
  });
});
