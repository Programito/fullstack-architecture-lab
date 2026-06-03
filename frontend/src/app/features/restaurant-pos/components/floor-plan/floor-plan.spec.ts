import { fireEvent, render, screen, within } from '@testing-library/angular';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { FloorPlan } from './floor-plan';

describe('FloorPlan', () => {
  it('renders floor elements as restaurant plan objects', async () => {
    await render(FloorPlan);

    expect(screen.getByLabelText('M1 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Bar floor element')).toBeTruthy();
    expect(screen.getByLabelText('Kitchen floor element')).toBeTruthy();
    expect(screen.getByLabelText('Entrance floor element')).toBeTruthy();
  });

  it('renders the default bar one cell longer with three independent stools above it', async () => {
    await render(FloorPlan);

    const bar = screen.getByLabelText('Bar floor element');
    expect(bar.getAttribute('style')).toContain('grid-column: 1 / span 3');
    expect(screen.queryByLabelText('Bar stools')).toBeNull();
    expect(screen.getByLabelText('Stool 1 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Stool 2 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Stool 3 floor element')).toBeTruthy();
  });

  it('selects a floor element and shows one contextual toolbar in layout mode', async () => {
    await render(FloorPlan);

    expect(screen.queryByRole('toolbar', { name: 'Layout element actions' })).toBeNull();

    fireEvent.click(screen.getByLabelText('M1 floor element'));

    const toolbar = screen.getByRole('toolbar', { name: 'Layout element actions' });
    expect(toolbar).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Move M1' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Resize M1' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Edit M1' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Delete M1' })).toBeTruthy();
    expect(screen.getAllByRole('toolbar', { name: 'Layout element actions' }).length).toBe(1);
  });

  it('shows the contextual toolbar only for the selected element', async () => {
    await render(FloorPlan);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    expect(screen.getByRole('button', { name: 'Edit M1' })).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Bar floor element'));

    expect(screen.queryByRole('button', { name: 'Edit M1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Bar' })).toBeTruthy();
  });

  it('does not render edit, move, or delete controls inside every element', async () => {
    await render(FloorPlan);

    expect(screen.queryByRole('button', { name: 'Edit M1' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete M1' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move M1' })).toBeNull();
  });

  it('emits the selected element when clicking Edit', async () => {
    const editElement = vi.fn();
    await render('<app-floor-plan (editElement)="editElement($event)" />', {
      imports: [FloorPlan],
      componentProperties: { editElement },
    });

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit M1' }));

    expect(editElement).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1' }));
  });

  it('emits the selected element when clicking Resize', async () => {
    const resizeElement = vi.fn();
    await render('<app-floor-plan (resizeElement)="resizeElement($event)" />', {
      imports: [FloorPlan],
      componentProperties: { resizeElement },
    });

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));

    expect(resizeElement).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1' }));
  });

  it('asks for confirmation before deleting the selected element', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { fixture } = await render(FloorPlan);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete M1' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this element from the layout?');
    expect(store.floorElements().some((element) => element.id === 'floor-element-1')).toBe(false);
  });

  it('allows moving the selected element from the object or the move toolbar action', async () => {
    await render(FloorPlan);

    fireEvent.click(screen.getByLabelText('M1 floor element'));

    expect(screen.getByLabelText('M1 floor element').hasAttribute('cdkdrag')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move M1' }).hasAttribute('cdkdraghandle')).toBe(true);
    expect(screen.getByLabelText('M1 floor element').querySelectorAll('[cdkdraghandle]').length).toBeGreaterThan(1);
  });

  it('disables drag and hides the edit toolbar outside layout mode', async () => {
    await render('<app-floor-plan [layoutMode]="false" />', { imports: [FloorPlan] });

    fireEvent.click(screen.getByLabelText('M1 floor element'));

    expect(screen.getByLabelText('M1 floor element').getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByRole('toolbar', { name: 'Layout element actions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move M1' })).toBeNull();
  });

  it('renders table label and capacity without service state details in layout mode', async () => {
    await render(FloorPlan);

    expect(screen.getByText('M1')).toBeTruthy();
    expect(screen.getByText('2 pax')).toBeTruthy();
    expect(screen.queryByText(/free/i)).toBeNull();
    expect(screen.queryByText(/occupied/i)).toBeNull();
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.queryByText('12m')).toBeNull();
  });

  it('renders distinct bar, kitchen, entrance, bathroom, stool, and blocked objects', async () => {
    const { fixture } = await render(FloorPlan);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.addFloorElement({ type: 'bathroom', label: 'Bathroom', x: 4, y: 4, width: 1, height: 1 });
    store.addFloorElement({ type: 'stool', label: 'Stool', x: 5, y: 4, width: 1, height: 1 });
    store.addFloorElement({ type: 'blocked', label: 'Blocked area', x: 5, y: 5, width: 1, height: 1 });
    fixture.detectChanges();

    expect(screen.getByLabelText('Bar object')).toBeTruthy();
    expect(screen.queryByLabelText('Bar stools')).toBeNull();
    expect(screen.getByLabelText('Kitchen object')).toBeTruthy();
    expect(screen.getByLabelText('Entrance object')).toBeTruthy();
    expect(screen.getByLabelText('Bathroom object')).toBeTruthy();
    expect(screen.getByLabelText('Stool object')).toBeTruthy();
    expect(screen.getByLabelText('Blocked area object')).toBeTruthy();
  });

  it('keeps a large table label and capacity visible while the visual fills the element', async () => {
    const { fixture } = await render(FloorPlan);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.addFloorElement({ type: 'table', label: 'M9', x: 2, y: 4, width: 3, height: 2, shape: 'long' });
    fixture.detectChanges();

    const table = screen.getByLabelText('M9 floor element');
    expect(within(table).getByText('M9')).toBeTruthy();
    expect(within(table).getByText('4 pax')).toBeTruthy();
    expect(table.querySelector('svg[data-table-svg="long"]')).toBeTruthy();
  });
});
