import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosLayoutPage } from './restaurant-pos-layout-page';

describe('RestaurantPosLayoutPage', () => {
  const renderLayoutPage = async (locale = 'es') => {
    const i18n = provideI18nTesting(locale);
    return render(RestaurantPosLayoutPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });
  };

  it('shows a clean layout toolbar without technical grid controls on the page', async () => {
    await renderLayoutPage();

    expect(screen.getByText('Plano del restaurante')).toBeTruthy();
    expect(screen.getByText('Diseña el comedor, la barra, la cocina y las zonas de servicio.')).toBeTruthy();
    const header = screen.getByRole('banner');
    const toolbar = screen.getByRole('toolbar', { name: 'Acciones de edición del plano' });
    expect(within(toolbar).getByRole('button', { name: 'Redimensionar plano' }).className).toContain('button--neutral-clear');
    expect(within(toolbar).getByRole('button', { name: 'Añadir elemento' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Guardar cambios' })).toHaveProperty('disabled', true);
    expect(within(toolbar).queryByRole('link', { name: 'Volver al modo servicio' })).toBeNull();
    expect(within(header).getByRole('link', { name: 'Volver al modo servicio' })).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'Cambiar a modo oscuro' })).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'Idioma: Español' })).toBeTruthy();
    expect(within(header).queryByText('La preferencia se aplica a la interfaz.')).toBeNull();
    expect(screen.queryByRole('button', { name: /add row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add column/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove column/i })).toBeNull();
    expect(screen.queryByLabelText('Width')).toBeNull();
    expect(screen.queryByLabelText('Height')).toBeNull();
  });

  it('renders the layout header actions in Catalan', async () => {
    await renderLayoutPage('ca');

    expect(screen.getByRole('heading', { name: 'Plànol del restaurant' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: "Accions d'edició del plànol" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Afegir element' })).toBeTruthy();
  });

  it('shows compact layout status above the floor plan', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    expect(screen.getByText('Modo plano')).toBeTruthy();
    expect(screen.getByText('20 columnas x 20 filas')).toBeTruthy();
    expect(screen.getByText(`${store.floorElements().length} elementos`)).toBeTruthy();
    expect(screen.getByText('Ningún elemento seleccionado')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));

    expect(screen.getByText('Seleccionado: M1')).toBeTruthy();
  });

  it('opens the resize layout modal from the toolbar', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));

    expect(screen.getByRole('dialog', { name: 'Redimensionar plano' })).toBeTruthy();
    const dialog = screen.getByRole('dialog', { name: 'Redimensionar plano' });
    expect(within(dialog).getByRole('button', { name: 'Cerrar redimensionar plano' })).toBeTruthy();
    expect(within(dialog).getByLabelText('Controles de tamaño del plano')).toBeTruthy();
    expect(within(dialog).getByLabelText('Vista previa de redimensión')).toBeTruthy();
    expect(within(dialog).getByText('20 columnas x 20 filas')).toBeTruthy();
    expect(within(screen.getByLabelText('Matriz de redimensión')).getAllByRole('button').length).toBe(400);
    expect(screen.getByLabelText('Filas')).toHaveProperty('value', '20');
    expect(screen.getByLabelText('Columnas')).toHaveProperty('value', '20');
  });

  it('updates the rows and columns preview when selecting cells in the resize matrix', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar 8 columnas x 6 filas' }));

    expect(screen.getByText('8 columnas x 6 filas')).toBeTruthy();
    expect(screen.getByLabelText('Filas')).toHaveProperty('value', '6');
    expect(screen.getByLabelText('Columnas')).toHaveProperty('value', '8');
  });

  it('updates the visual matrix preview when typing rows and columns', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));
    fireEvent.input(screen.getByLabelText('Filas'), { target: { value: '7' } });
    fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '9' } });

    expect(screen.getByText('9 columnas x 7 filas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Seleccionar 9 columnas x 7 filas' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('prevents invalid resize when existing elements would be outside the grid', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));
    fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño del plano' }));
    fixture.detectChanges();

    expect(store.gridColumns()).toBe(20);
    expect(screen.getAllByText('No se puede redimensionar el plano porque algunos elementos quedarían fuera de la matriz.').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog', { name: 'Redimensionar plano' })).toBeTruthy();
  });

  it('applies a valid resize only after confirmation', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar 10 columnas x 9 filas' }));

    expect(store.gridRows()).toBe(20);
    expect(store.gridColumns()).toBe(20);

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño del plano' }));

    expect(store.gridRows()).toBe(9);
    expect(store.gridColumns()).toBe(10);
  });

  it('opens a separate add element modal from the toolbar', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));

    const dialog = screen.getByRole('dialog', { name: 'Añadir elemento' });
    expect(dialog).toBeTruthy();
    expect(dialog.className).toContain('theme-dialog');
    expect(within(dialog).getByRole('button', { name: 'Cerrar formulario de elemento' })).toBeTruthy();
    expect(within(dialog).getByLabelText('Configuración del elemento')).toBeTruthy();
    expect(within(dialog).getByLabelText('Vista previa del elemento seleccionado').className).toContain('border-[var(--ui-border)]');
    expect(screen.getByLabelText('Tipo de elemento')).toHaveProperty('value', 'small-table');
    expect(screen.getByLabelText('Tipo de elemento').className).toContain('theme-field');
    expect(screen.getByRole('option', { name: 'Barra horizontal' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Barra vertical' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Taburete' })).toBeTruthy();
    expect(screen.getByLabelText('Tamaño predefinido')).toHaveProperty('value', 'small-table');
    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '2');
    expect(within(dialog).getByText('20 columnas x 20 filas')).toBeTruthy();
  });

  it('keeps the add element position selector visually clean while preserving accessible cell labels', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));

    const selector = screen.getByLabelText('Selector de posición');
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
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));

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
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'kitchen' } });

    const dialog = screen.getByRole('dialog', { name: 'Añadir elemento' });
    expect(within(dialog).getAllByText('Cocina').length).toBeGreaterThan(1);
    expect(within(dialog).getByText('Tamaño: 2 x 1')).toBeTruthy();
    expect(within(dialog).queryByText('2 pax')).toBeNull();
  });

  it('syncs preset size with custom width and height inputs', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.change(screen.getByLabelText('Tamaño predefinido'), { target: { value: 'square-table' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '2');

    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '3' } });
    fireEvent.input(screen.getByLabelText('Alto'), { target: { value: '1' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '3');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '1');
  });

  it('sets a vertical bar preset to one column by three rows', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'bar-vertical' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '1');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '3');
    expect(screen.getByText('Tamaño: 1 x 3')).toBeTruthy();
    expect(screen.getAllByText('Barra vertical').some((element) => element.className.includes('theme-vertical-label'))).toBe(true);
  });

  it('updates generated element labels when changing presets until the user edits the label', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));

    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'M5');

    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'bar-vertical' } });
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'Barra vertical');

    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'stool' } });
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'T4');

    fireEvent.input(screen.getByLabelText('Etiqueta del elemento'), { target: { value: 'VIP stool' } });
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'kitchen' } });

    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'VIP stool');
  });

  it('opens the element modal in edit mode from the floor plan toolbar', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar M1' }));

    expect(screen.getByRole('dialog', { name: 'Editar elemento' })).toBeTruthy();
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'M1');
    expect(screen.getByLabelText('Capacidad de mesa')).toHaveProperty('value', '2');
  });

  it('uses the current grid size in the add element position selector', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.setGridSize(9, 10);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));

    const selector = screen.getByLabelText('Selector de posición');
    expect(within(selector).getAllByRole('button').length).toBe(90);
    expect(within(screen.getByRole('dialog', { name: 'Añadir elemento' })).getByText('10 columnas x 9 filas')).toBeTruthy();
  });

  it('adds an element when a valid position is selected', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
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
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
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
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialTableCount = store.restaurantTables().length;

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'stool' } });
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 20 fila 20' }));
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'T4');
    fireEvent.click(screen.getByRole('button', { name: 'Añadir T4' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'stool',
        label: 'T4',
        width: 1,
        height: 1,
      }),
    );
    expect(store.restaurantTables().length).toBe(initialTableCount);
  });

  it('adds a vertical bar as a bar floor element without changing the model type', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'bar-vertical' } });
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 10 fila 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Barra vertical' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'bar',
        label: 'Barra vertical',
        width: 1,
        height: 3,
        x: 9,
        y: 1,
      }),
    );
  });

  it('opens the resize element modal from the floor plan toolbar', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));
    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar M1' }));

    expect(screen.getByRole('dialog', { name: 'Redimensionar elemento' })).toBeTruthy();
    expect(screen.getByLabelText('Ancho del elemento')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto del elemento')).toHaveProperty('value', '2');
  });

  it('applies a valid selected element resize', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));
    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar M1' }));
    fireEvent.input(screen.getByLabelText('Ancho del elemento'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño' }));

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 3, height: 2 }));
  });

  it('prevents an invalid selected element resize', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));
    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar M1' }));
    fireEvent.input(screen.getByLabelText('Ancho del elemento'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño' }));
    fixture.detectChanges();

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 2, height: 2 }));
    expect(within(screen.getByRole('dialog', { name: 'Redimensionar elemento' })).getByText('No se puede colocar el elemento aquí.')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Redimensionar elemento' })).toBeTruthy();
  });

  it('keeps edge placement inside the grid for custom occupied sizes', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.setGridSize(10, 10);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
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
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar M1' }));
    fireEvent.input(screen.getByLabelText('Etiqueta del elemento'), { target: { value: 'Terrace 1' } });
    fireEvent.input(screen.getByLabelText('Capacidad de mesa'), { target: { value: '6' } });
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Editar elemento' })).getByRole('button', { name: 'Guardar cambios' }));

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({ label: 'Terrace 1' }),
    );
    expect(store.restaurantTables().find((table) => table.id === 'table-1')).toEqual(expect.objectContaining({ capacity: 6 }));
  });

  it('disables adding an element for an invalid position', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 1 fila 1' }));

    expect(screen.getByText('La posición seleccionada no está disponible. Elige otra celda libre dentro de la matriz.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir M5' })).toHaveProperty('disabled', true);
  });

  it('marks cells where the selected element cannot be placed as unavailable', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '2' } });

    const availableCell = screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' });
    expect(availableCell.className).toContain('bg-emerald-50');

    const unavailableCell = screen.getByRole('button', { name: 'Colocar en columna 1 fila 1' });
    expect(unavailableCell.getAttribute('aria-disabled')).toBe('true');
    expect(unavailableCell.className).toContain('cursor-not-allowed');
    expect(unavailableCell.className).toContain('repeating-linear-gradient');
  });

  it('allows the last matrix cell to anchor a fitting element inside the layout', async () => {
    await renderLayoutPage();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 20 fila 20' }));

    expect(screen.getByText('Columnas 19-20, filas 19-20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir M5' })).toHaveProperty('disabled', false);
  });
});
