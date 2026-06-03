import { fireEvent, render, screen, within } from '@testing-library/angular';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosLayoutPage } from './restaurant-pos-layout-page';

describe('RestaurantPosLayoutPage', () => {
  it('shows a clean layout toolbar without technical grid controls on the page', async () => {
    await render(RestaurantPosLayoutPage);

    expect(screen.getByText('Restaurant layout')).toBeTruthy();
    expect(screen.getByText('Design your dining room, bar, kitchen and service areas.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resize layout' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add element' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to service mode' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add column/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove column/i })).toBeNull();
    expect(screen.queryByLabelText('Width')).toBeNull();
    expect(screen.queryByLabelText('Height')).toBeNull();
  });

  it('opens the resize layout modal from the toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));

    expect(screen.getByRole('dialog', { name: 'Resize layout' })).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: 'Resize layout' })).getByText('6 columns x 6 rows')).toBeTruthy();
    expect(screen.getByLabelText('Rows')).toHaveProperty('value', '6');
    expect(screen.getByLabelText('Columns')).toHaveProperty('value', '6');
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

    expect(store.gridColumns()).toBe(6);
    expect(screen.getAllByText('Cannot resize layout because some elements would be outside the grid.').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog', { name: 'Resize layout' })).toBeTruthy();
  });

  it('applies a valid resize only after confirmation', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Resize layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select 8 columns x 7 rows' }));

    expect(store.gridRows()).toBe(6);
    expect(store.gridColumns()).toBe(6);

    fireEvent.click(screen.getByRole('button', { name: 'Apply layout size' }));

    expect(store.gridRows()).toBe(7);
    expect(store.gridColumns()).toBe(8);
  });

  it('opens a separate add element modal from the toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));

    expect(screen.getByRole('dialog', { name: 'Add element' })).toBeTruthy();
    expect(screen.getByLabelText('Element type')).toHaveProperty('value', 'small-table');
    expect(screen.getByRole('option', { name: 'Stool' })).toBeTruthy();
    expect(screen.getByLabelText('Preset size')).toHaveProperty('value', 'small-table');
    expect(screen.getByLabelText('Width')).toHaveProperty('value', '1');
    expect(screen.getByLabelText('Height')).toHaveProperty('value', '1');
    expect(within(screen.getByRole('dialog', { name: 'Add element' })).getByText('6 columns x 6 rows')).toBeTruthy();
  });

  it('syncs preset size with custom width and height inputs', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Preset size'), { target: { value: 'square-table' } });

    expect(screen.getByLabelText('Width')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Height')).toHaveProperty('value', '2');

    fireEvent.input(screen.getByLabelText('Width'), { target: { value: '3' } });
    fireEvent.input(screen.getByLabelText('Height'), { target: { value: '1' } });

    expect(screen.getByLabelText('Width')).toHaveProperty('value', '3');
    expect(screen.getByLabelText('Height')).toHaveProperty('value', '1');
  });

  it('opens the element modal in edit mode from the floor plan toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit M1' }));

    expect(screen.getByRole('dialog', { name: 'Edit element' })).toBeTruthy();
    expect(screen.getByLabelText('Element label')).toHaveProperty('value', 'M1');
    expect(screen.getByLabelText('Table capacity')).toHaveProperty('value', '2');
  });

  it('uses the current grid size in the add element position selector', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.setGridSize(7, 8);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));

    const selector = screen.getByLabelText('Position selector');
    expect(within(selector).getAllByRole('button').length).toBe(56);
    expect(within(screen.getByRole('dialog', { name: 'Add element' })).getByText('8 columns x 7 rows')).toBeTruthy();
  });

  it('adds an element when a valid position is selected', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.click(screen.getByRole('button', { name: 'Place at column 6 row 6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected element' }));

    expect(store.floorElements().length).toBe(initialElementCount + 1);
    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        label: 'M5',
        x: 5,
        y: 5,
      }),
    );
  });

  it('adds an element with a custom occupied size', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.input(screen.getByLabelText('Width'), { target: { value: '3' } });
    fireEvent.input(screen.getByLabelText('Height'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place at column 3 row 6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected element' }));

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        width: 3,
        height: 1,
        x: 2,
        y: 5,
      }),
    );
  });

  it('adds a stool as an independent floor element', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialTableCount = store.restaurantTables().length;

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.change(screen.getByLabelText('Element type'), { target: { value: 'stool' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place at column 6 row 6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected element' }));

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

  it('opens the resize element modal from the floor plan toolbar', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));

    expect(screen.getByRole('dialog', { name: 'Resize element' })).toBeTruthy();
    expect(screen.getByLabelText('Element width')).toHaveProperty('value', '1');
    expect(screen.getByLabelText('Element height')).toHaveProperty('value', '1');
  });

  it('applies a valid selected element resize', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));
    fireEvent.input(screen.getByLabelText('Element height'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply size' }));

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 1, height: 2 }));
  });

  it('prevents an invalid selected element resize', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));
    fireEvent.input(screen.getByLabelText('Element width'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply size' }));
    fixture.detectChanges();

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 1, height: 1 }));
    expect(within(screen.getByRole('dialog', { name: 'Resize element' })).getByText('Cannot place element here')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Resize element' })).toBeTruthy();
  });

  it('uses custom occupied size when validating placement', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.input(screen.getByLabelText('Width'), { target: { value: '2' } });
    fireEvent.input(screen.getByLabelText('Height'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place at column 6 row 6' }));

    expect(screen.getByText('This position is not available.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add selected element' })).toHaveProperty('disabled', true);
  });

  it('saves layout-only changes from the edit modal', async () => {
    const { fixture } = await render(RestaurantPosLayoutPage);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit M1' }));
    fireEvent.input(screen.getByLabelText('Element label'), { target: { value: 'Terrace 1' } });
    fireEvent.input(screen.getByLabelText('Table capacity'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save element' }));

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({ label: 'Terrace 1' }),
    );
    expect(store.restaurantTables().find((table) => table.id === 'table-1')).toEqual(expect.objectContaining({ capacity: 6 }));
  });

  it('disables adding an element for an invalid position', async () => {
    await render(RestaurantPosLayoutPage);

    fireEvent.click(screen.getByRole('button', { name: 'Add element' }));
    fireEvent.click(screen.getByRole('button', { name: 'Place at column 1 row 1' }));

    expect(screen.getByText('This position is not available.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add selected element' })).toHaveProperty('disabled', true);
  });
});
