import { fireEvent, render, screen } from '@testing-library/angular';
import { SearchInput } from './search-input';

describe('SearchInput', () => {
  it('renders a labelled searchbox', async () => {
    await render('<app-search-input label="Buscar" placeholder="Buscar proyectos" />', {
      imports: [SearchInput],
    });

    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toBeTruthy();
  });

  it('emits valueChange on input', async () => {
    const valueChange = vi.fn();

    await render('<app-search-input label="Buscar" (valueChange)="valueChange($event)" />', {
      imports: [SearchInput],
      componentProperties: { valueChange },
    });

    fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'Angular' } });

    expect(valueChange).toHaveBeenCalledWith('Angular');
  });

  it('emits searched on submit', async () => {
    const searched = vi.fn();

    await render('<app-search-input label="Buscar" value="Angular" (searched)="searched($event)" />', {
      imports: [SearchInput],
      componentProperties: { searched },
    });

    fireEvent.submit(screen.getByRole('search'));

    expect(searched).toHaveBeenCalledWith('Angular');
  });

  it('supports clear action', async () => {
    const valueChange = vi.fn();
    const cleared = vi.fn();

    await render(
      '<app-search-input label="Buscar" [value]="value" (valueChange)="value = $event; valueChange($event)" (cleared)="cleared()" />',
      {
        imports: [SearchInput],
        componentProperties: { value: 'Angular', valueChange, cleared },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar busqueda' }));

    expect(valueChange).toHaveBeenCalledWith('');
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Limpiar busqueda' })).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveProperty('value', '');
  });

  it('does not render clear action when clearable is false', async () => {
    await render('<app-search-input label="Buscar" value="Angular" appearance="minimal" [clearable]="false" />', {
      imports: [SearchInput],
    });

    expect(screen.getByRole('searchbox', { name: 'Buscar' }).className).toContain('search-input__control--minimal');
    expect(screen.queryByRole('button', { name: 'Limpiar busqueda' })).toBeNull();
  });

  it('shows clear action after typing when the parent updates value', async () => {
    await render('<app-search-input label="Buscar" [value]="value" (valueChange)="value = $event" />', {
      imports: [SearchInput],
      componentProperties: { value: '' },
    });

    fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'Angular' } });

    expect(screen.getByRole('button', { name: 'Limpiar busqueda' })).toBeTruthy();
  });
});
