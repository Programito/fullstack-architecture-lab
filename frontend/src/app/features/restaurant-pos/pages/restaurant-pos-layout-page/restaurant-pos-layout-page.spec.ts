import { fireEvent, render, screen, within } from '@testing-library/angular';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosLayoutPage } from './restaurant-pos-layout-page';

describe('RestaurantPosLayoutPage', () => {
  it('shows a clean layout toolbar without technical grid controls on the page', async () => {
    await render(RestaurantPosLayoutPage);

    expect(screen.getByText('Restaurant layout')).toBeTruthy();
    expect(screen.getByText('Design your dining room, bar, kitchen and service areas.')).toBeTruthy();
    const toolbar = screen.getByRole('toolbar', { name: 'Layout editing actions' });
    expect(within(toolbar).getByRole('button', { name: 'Resize layout' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Add element' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true);
    expect(within(toolbar).queryByRole('link', { name: 'Back to service mode' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to service mode' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add column/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove column/i })).toBeNull();
    expect(screen.queryByLabelText('Width')).toBeNull();
    expect(screen.queryByLabelText('Height')).toBeNull();
  });

  it('shows compact layout status above the floor plan', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    expect(screen.getByText('Layout mode')).toBeTruthy();
    expect(screen.getByText('20 columns x 20 rows')).toBeTruthy();
    expect(screen.getByText(`${store.floorElements().length} elements`)).toBeTruthy();
    expect(screen.getByText('No element selected')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('M1 floor element'));

    expect(screen.getByText('Selected: M1')).toBeTruthy();
  });

  it('opens the resize layout modal from the toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));

    expect(screen.getByRole('dialog', { name: 'Resize layout' })).toBeTruthy();
    const dialog = screen.getByRole('dialog', { name: 'Resize layout' });
    expect(within(dialog).getByRole('button', { name: 'Close resize layout' })).toBeTruthy();
    expect(within(dialog).getByLabelText('Layout size controls')).toBeTruthy();
    expect(within(dialog).getByLabelText('Resize preview')).toBeTruthy();
    expect(within(dialog).getByText('20 columns x 20 rows')).toBeTruthy();
    expect(within(screen.getByLabelText('Resize matrix')).getAllByRole('button').length).toBe(400);
    expect(screen.getByLabelText('Rows')).toHaveProperty('value', '20');
    expect(screen.getByLabelText('Columns')).toHaveProperty('value', '20');
  });

  it('updates the rows and columns preview when selecting cells in the resize matrix', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select 8 columns x 6 rows' }));

    expect(screen.getByText('8 columns x 6 rows')).toBeTruthy();
    expect(screen.getByLabelText('Rows')).toHaveProperty('value', '6');
    expect(screen.getByLabelText('Columns')).toHaveProperty('value', '8');
  });

  it('updates the visual matrix preview when typing rows and columns', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));
    fireEvent.input(screen.getByLabelText('Rows'), { target: { value: '7' } });
    fireEvent.input(screen.getByLabelText('Columns'), { target: { value: '9' } });

    expect(screen.getByText('9 columns x 7 rows')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select 9 columns x 7 rows' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('prevents invalid resize when existing elements would be outside the grid', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));
    fireEvent.input(screen.getByLabelText('Columns'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply layout size' }));
    fixture.detectChanges();

    expect(store.gridColumns()).toBe(20);
    expect(screen.getAllByText('Cannot resize layout because some elements would be outside the grid.').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog', { name: 'Resize layout' })).toBeTruthy();
  });

  it('applies a valid resize only after confirmation', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select 10 columns x 9 rows' }));

    expect(store.gridRows()).toBe(20);
    expect(store.gridColumns()).toBe(20);

    fireEvent.click(screen.getByRole('button', { name: 'Apply layout size' }));

    expect(store.gridRows()).toBe(9);
    expect(store.gridColumns()).toBe(10);
  });

  it('opens a separate add element modal from the toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));

    const dialog = screen.getByRole('dialog', { name: 'Añadir elemento' });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Cerrar formulario de elemento' })).toBeTruthy();
    expect(within(dialog).getByLabelText('Configuración del elemento')).toBeTruthy();
    expect(within(dialog).getByLabelText('Vista previa del elemento seleccionado')).toBeTruthy();
    expect(screen.getByLabelText('Tipo de elemento')).toHaveProperty('value', 'small-table');
    expect(screen.getByRole('option', { name: 'Bar horizontal' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Bar vertical' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Stool' })).toBeTruthy();
    expect(screen.getByLabelText('Tamaño predefinido')).toHaveProperty('value', 'small-table');
    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '2');
    expect(within(dialog).getByText('20 columns x 20 rows')).toBeTruthy();
  });

  it('keeps the add element position selector visually clean while preserving accessible cell labels', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));

    const selector = screen.getByLabelText('Position selector');
    expect(within(selector).getByRole('button', { name: 'Colocar en columna 9 fila 9' })).toBeTruthy();
    expect(within(selector).queryByText('9,9')).toBeNull();
    expect(screen.getByText('Posición sin seleccionar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }));

    expect(screen.getByText('Columnas 9-10, filas 9-10')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 10 fila 9' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 10' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 10 fila 10' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }).className).toContain('ring-cyan-700');
    expect(screen.getByRole('button', { name: 'Colocar en columna 10 fila 10' }).className).toContain('ring-cyan-500');

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Colocar en columna 12 fila 12' }));

    expect(screen.getByRole('button', { name: 'Colocar en columna 12 fila 12' }).className).toContain('bg-sky-100');
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }).className).toContain('ring-cyan-700');
  });

  it('shows a selected element preview and summary in the add element modal', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));

    const dialog = screen.getByRole('dialog', { name: 'Añadir elemento' });
    expect(within(dialog).getByLabelText('Vista previa del elemento seleccionado')).toBeTruthy();
    expect(within(dialog).getByText('M5')).toBeTruthy();
    expect(within(dialog).getByText('2 pax')).toBeTruthy();
    expect(within(dialog).getByText('Tamaño: 2 x 2')).toBeTruthy();
    expect(within(dialog).getByText('Posición: sin seleccionar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }));

    expect(within(dialog).getByText('Posición: columna 9, fila 9')).toBeTruthy();
  });

  it('updates the selected element preview when choosing another preset', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'kitchen' } });

    const dialog = screen.getByRole('dialog', { name: 'Añadir elemento' });
    expect(within(dialog).getAllByText('Kitchen').length).toBeGreaterThan(1);
    expect(within(dialog).getByText('Tamaño: 2 x 1')).toBeTruthy();
    expect(within(dialog).queryByText('2 pax')).toBeNull();
  });

  it('syncs preset size with custom width and height inputs', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Tamaño predefinido'), { target: { value: 'square-table' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '2');

    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '3' } });
    fireEvent.input(screen.getByLabelText('Alto'), { target: { value: '1' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '3');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '1');
  });

  it('sets a vertical bar preset to one column by three rows', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'bar-vertical' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '1');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '3');
    expect(screen.getByText('Tamaño: 1 x 3')).toBeTruthy();
  });

  it('opens the element modal in edit mode from the floor plan toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit M1' }));

    expect(screen.getByRole('dialog', { name: 'Editar elemento' })).toBeTruthy();
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'M1');
    expect(screen.getByLabelText('Capacidad de mesa')).toHaveProperty('value', '2');
  });

  it('uses the current grid size in the add element position selector', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.setGridSize(9, 10);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));

    const selector = screen.getByLabelText('Position selector');
    expect(within(selector).getAllByRole('button').length).toBe(90);
    expect(within(screen.getByRole('dialog', { name: 'Añadir elemento' })).getByText('10 columns x 9 rows')).toBeTruthy();
  });

  it('adds an element when a valid position is selected', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir M5' }));

    expect(store.floorElements().length).toBe(initialElementCount + 1);
    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        label: 'M5',
        x: 8,
        y: 8,
        width: 2,
        height: 2,
      }),
    );
  });

  it('adds an element with a custom occupied size', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '3' } });
    fireEvent.input(screen.getByLabelText('Alto'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 5 fila 10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir M5' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        width: 3,
        height: 1,
        x: 4,
        y: 9,
      }),
    );
  });

  it('adds a stool as an independent floor element', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialTableCount = store.restaurantTables().length;

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'stool' } });
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 20 fila 20' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Stool' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'stool',
        label: 'Stool',
        width: 1,
        height: 1,
      }),
    );
    expect(store.restaurantTables().length).toBe(initialTableCount);
  });

  it('adds a vertical bar as a bar floor element without changing the model type', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'bar-vertical' } });
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 10 fila 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Bar vertical' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'bar',
        label: 'Bar vertical',
        width: 1,
        height: 3,
        x: 9,
        y: 1,
      }),
    );
  });

  it('opens the resize element modal from the floor plan toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));

    expect(screen.getByRole('dialog', { name: 'Resize element' })).toBeTruthy();
    expect(screen.getByLabelText('Element width')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Element height')).toHaveProperty('value', '2');
  });

  it('applies a valid selected element resize', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));
    fireEvent.input(screen.getByLabelText('Element width'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply size' }));

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 3, height: 2 }));
  });

  it('prevents an invalid selected element resize', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));
    fireEvent.input(screen.getByLabelText('Element width'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply size' }));
    fixture.detectChanges();

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 2, height: 2 }));
    expect(within(screen.getByRole('dialog', { name: 'Resize element' })).getByText('Cannot place element here')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Resize element' })).toBeTruthy();
  });

  it('keeps edge placement inside the grid for custom occupied sizes', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.setGridSize(10, 10);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '2' } });
    fireEvent.input(screen.getByLabelText('Alto'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 10 fila 10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir M5' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        x: 8,
        y: 8,
        width: 2,
        height: 2,
      }),
    );
  });

  it('saves layout-only changes from the edit modal', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit M1' }));
    fireEvent.input(screen.getByLabelText('Etiqueta del elemento'), { target: { value: 'Terrace 1' } });
    fireEvent.input(screen.getByLabelText('Capacidad de mesa'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({ label: 'Terrace 1' }),
    );
    expect(store.restaurantTables().find((table) => table.id === 'table-1')).toEqual(expect.objectContaining({ capacity: 6 }));
  });

  it('disables adding an element for an invalid position', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 1 fila 1' }));

    expect(screen.getByText('La posición seleccionada no está disponible. Elige otra celda libre dentro de la matriz.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir M5' })).toHaveProperty('disabled', true);
  });

  it('marks cells where the selected element cannot be placed as unavailable', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '2' } });

    const availableCell = screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' });
    expect(availableCell.className).toContain('bg-emerald-50');

    const unavailableCell = screen.getByRole('button', { name: 'Colocar en columna 1 fila 1' });
    expect(unavailableCell.getAttribute('aria-disabled')).toBe('true');
    expect(unavailableCell.className).toContain('cursor-not-allowed');
    expect(unavailableCell.className).toContain('repeating-linear-gradient');
  });

  it('allows the last matrix cell to anchor a fitting element inside the layout', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 20 fila 20' }));

    expect(screen.getByText('Columnas 19-20, filas 19-20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir M5' })).toHaveProperty('disabled', false);
  });
});
