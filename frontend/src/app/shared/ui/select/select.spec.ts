import { fireEvent, render, screen } from '@testing-library/angular';
import { Select, type SelectOption } from './select';

const options: SelectOption[] = [
  { label: 'Producto', value: 'product' },
  { label: 'Soporte', value: 'support' },
];

describe('Select', () => {
  it('renders a labelled select with options', async () => {
    await render('<app-select label="Categoria" [options]="options" />', {
      imports: [Select],
      componentProperties: {
        options,
      },
    });

    expect(screen.getByLabelText('Categoria')).toBeTruthy();
    expect(screen.getByText('Producto')).toBeTruthy();
  });

  it('renders error state', async () => {
    await render('<app-select label="Categoria" error="Selecciona una categoria" [options]="options" />', {
      imports: [Select],
      componentProperties: {
        options,
      },
    });

    const select = screen.getByLabelText('Categoria');
    expect(screen.getByText('Selecciona una categoria')).toBeTruthy();
    expect(select.getAttribute('aria-invalid')).toBe('true');
  });

  it('emits value changes', async () => {
    const changed = vi.fn();

    await render('<app-select label="Categoria" [options]="options" (valueChange)="changed($event)" />', {
      imports: [Select],
      componentProperties: {
        options,
        changed,
      },
    });

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'support' } });

    expect(changed).toHaveBeenCalledWith('support');
  });

  it('reflects an initial value', async () => {
    await render('<app-select label="Categoria" value="support" [options]="options" />', {
      imports: [Select],
      componentProperties: {
        options,
      },
    });

    expect((screen.getByLabelText('Categoria') as HTMLSelectElement).value).toBe('support');
  });

  it('applies solid focus without visible border tint', async () => {
    await render('<app-select label="Categoria" fill="solid" [options]="options" />', {
      imports: [Select],
      componentProperties: {
        options,
      },
    });

    const select = screen.getByLabelText('Categoria');
    expect(select.className).toContain('select-field__select--solid');
    expect(select.className).toContain('select-field__select--primary');
    expect(select.className).not.toContain('select-field__select--outline');
  });

  it('adds extra spacing for outline selects and exposes fill class', async () => {
    const { container } = await render('<app-select label="Categoria" fill="outline" appearance="minimal" [options]="options" />', {
      imports: [Select],
      componentProperties: {
        options,
      },
    });

    const select = screen.getByLabelText('Categoria');
    expect(container.querySelector('.select-field')?.className).toContain('select-field--outline');
    expect(container.querySelector('.select-field')?.className).toContain('select-field--minimal');
    expect(select.className).toContain('select-field__select--outline');
    expect(select.className).toContain('select-field__select--minimal');
    expect(select.className).toContain('select-field__select--md');
  });

  it('opens dialog mode with a title and selectable options', async () => {
    const changed = vi.fn();

    await render(
      '<app-select mode="dialog" label="Categoria" placeholder="Selecciona" dialogTitle="Selecciona categoria" [options]="options" (valueChange)="changed($event)" />',
      {
        imports: [Select],
        componentProperties: {
          options,
          changed,
        },
      },
    );

    const trigger = screen.getByRole('button', { name: 'Categoria' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Selecciona categoria' })).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: 'Soporte' }));

    expect(changed).toHaveBeenCalledWith('support');
    expect(screen.queryByRole('dialog', { name: 'Selecciona categoria' })).toBeNull();
  });
});
