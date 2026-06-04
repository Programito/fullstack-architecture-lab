import { fireEvent, render, screen, within } from '@testing-library/angular';
import type { FloorElement } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { FloorPlan } from './floor-plan';

type FloorPlanDragHarness = {
  handleDragEnded: (event: { distance: { x: number; y: number }; source: { getRootElement: () => HTMLElement; reset: () => void } }, element: FloorElement) => void;
};

const createDragEndEvent = (distance: { x: number; y: number }) => {
  const grid = document.createElement('div');
  const root = document.createElement('div');
  grid.style.columnGap = '0px';
  grid.style.rowGap = '0px';
  grid.getBoundingClientRect = () =>
    ({
      width: 600,
      height: 600,
      top: 0,
      left: 0,
      right: 600,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  grid.appendChild(root);

  return {
    distance,
    source: {
      getRootElement: () => root,
      reset: vi.fn(),
    },
  };
};

describe('FloorPlan', () => {
  it('renders floor elements as restaurant plan objects', async () => {
    await render(FloorPlan);

    expect(screen.getByLabelText('M1 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Bar floor element')).toBeTruthy();
    expect(screen.getByLabelText('Kitchen floor element')).toBeTruthy();
    expect(screen.getByLabelText('Entrance floor element')).toBeTruthy();
  });

  it('renders the floor matrix with stronger grid and cell borders', async () => {
    await render(FloorPlan);

    const matrix = screen.getByLabelText('Floor plan matrix');
    expect(matrix.getAttribute('style')).toContain('grid-template-columns: repeat(10, 5.5rem)');
    expect(matrix.getAttribute('style')).toContain('grid-template-rows: repeat(10, 5.5rem)');
    expect(matrix.className).toContain('border-stone-300');
    expect(matrix.className).toContain('bg-stone-50');
    expect(matrix.className).not.toContain('linear-gradient');
    expect(matrix.className).not.toContain('bg-[length:');
    expect(screen.getByLabelText('Cell 0, 0').className).toContain('border-stone-200/35');
    expect(screen.getByLabelText('Cell 0, 0').className).toContain('bg-white/5');
  });

  it('uses the inner matrix border as the placement boundary without extra inner padding', async () => {
    await render(FloorPlan);

    const matrix = screen.getByLabelText('Floor plan matrix');
    expect(matrix.className.split(' ')).not.toContain('p-2');
    expect(matrix.className.split(' ')).toContain('overflow-visible');
    expect(matrix.className.split(' ')).not.toContain('overflow-hidden');
    expect(matrix.className).toContain('border-stone-300');
  });

  it('keeps the outer canvas compact while leaving room for the selected toolbar', async () => {
    await render(FloorPlan);

    const canvas = screen.getByLabelText('Floor plan canvas');
    expect(canvas.className.split(' ')).toContain('grid');
    expect(canvas.className.split(' ')).toContain('place-items-center');
    expect(canvas.className.split(' ')).toContain('overflow-auto');
    expect(canvas.className.split(' ')).not.toContain('overflow-x-auto');
    expect(canvas.className).toContain('pt-10');
    expect(canvas.className.split(' ')).not.toContain('pt-20');
  });

  it('keeps selected elements and their toolbar above the matrix without clipping overlays', async () => {
    await render(FloorPlan);

    const element = screen.getByLabelText('M1 floor element');
    expect(element.className.split(' ')).toContain('p-1');
    expect(element.className.split(' ')).not.toContain('p-2');

    fireEvent.click(element);

    expect(element.className.split(' ')).toContain('z-40');
    expect(screen.getByRole('toolbar', { name: 'Layout element actions' }).className.split(' ')).toContain('z-50');
  });

  it('shows a subtle footprint border for the occupied element size', async () => {
    await render(FloorPlan);

    const element = screen.getByLabelText('M1 floor element');
    expect(element.className.split(' ')).toContain('border-stone-300');
    expect(element.className.split(' ')).toContain('bg-white/20');

    fireEvent.click(element);

    expect(element.className.split(' ')).toContain('border-cyan-400');
    expect(element.className).toContain('ring-cyan-500');
  });

  it('uses a tighter inset for small table visuals so the object reads larger inside the footprint', async () => {
    await render(FloorPlan);

    expect(screen.getByLabelText('M1 floor element').getAttribute('style')).toContain('grid-column: 2 / span 2');
    expect(screen.getByLabelText('M1 floor element').getAttribute('style')).toContain('grid-row: 2 / span 2');
    expect(screen.getAllByLabelText('Table shape rectangle')[0].className.split(' ')).toContain('inset-0');
  });

  it('renders the default bar one cell longer with three independent stools above it', async () => {
    await render(FloorPlan);

    const bar = screen.getByLabelText('Bar floor element');
    const barObject = screen.getByLabelText('Bar object');
    const barCapsule = barObject.firstElementChild as HTMLElement;

    expect(bar.getAttribute('style')).toContain('grid-column: 2 / span 3');
    expect(barObject.className.split(' ')).toContain('h-full');
    expect(barObject.className.split(' ')).toContain('w-full');
    expect(barCapsule.className.split(' ')).toContain('h-full');
    expect(barCapsule.className.split(' ')).toContain('w-full');
    expect(barCapsule.className.split(' ')).toContain('rounded-full');
    expect(screen.queryByLabelText('Bar stools')).toBeNull();
    expect(screen.getByLabelText('Stool 1 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Stool 2 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Stool 3 floor element')).toBeTruthy();
  });

  it('renders a vertical bar as a tall capsule that fills its footprint height', async () => {
    const { fixture } = await render(FloorPlan);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.addFloorElement({ type: 'bar', label: 'Vertical bar', x: 4, y: 0, width: 1, height: 3 });
    fixture.detectChanges();

    const bar = screen.getByLabelText('Vertical bar floor element');
    const barObject = screen.getByLabelText('Vertical bar object');
    const barCapsule = barObject.firstElementChild as HTMLElement;

    expect(bar.getAttribute('style')).toContain('grid-row: 1 / span 3');
    expect(barObject.className.split(' ')).toContain('h-full');
    expect(barObject.className.split(' ')).toContain('w-full');
    expect(barCapsule.className.split(' ')).toContain('h-full');
    expect(barCapsule.className.split(' ')).toContain('w-full');
    expect(barCapsule.className.split(' ')).toContain('rounded-full');
    expect(within(barCapsule).getByText('Vertical bar')).toBeTruthy();
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

  it('clamps movement to the first valid cell when dragging past the top or left edge', async () => {
    const { fixture } = await render(FloorPlan);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const moveFloorElement = vi.spyOn(store, 'moveFloorElement').mockImplementation(() => undefined);
    const element = store.floorElements().find((floorElement) => floorElement.id === 'floor-element-1');

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragEnded(createDragEndEvent({ x: -250, y: -250 }), element!);

    expect(moveFloorElement).toHaveBeenCalledWith('floor-element-1', 0, 0);
  });

  it('clamps movement to the last valid cell when dragging past the right or bottom edge', async () => {
    const { fixture } = await render(FloorPlan);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const moveFloorElement = vi.spyOn(store, 'moveFloorElement').mockImplementation(() => undefined);
    const element = store.floorElements().find((floorElement) => floorElement.id === 'floor-element-2');

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragEnded(createDragEndEvent({ x: 800, y: 800 }), element!);

    expect(moveFloorElement).toHaveBeenCalledWith('floor-element-2', 8, 8);
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

    store.addFloorElement({ type: 'table', label: 'M9', x: 4, y: 4, width: 3, height: 2, shape: 'long' });
    fixture.detectChanges();

    const table = screen.getByLabelText('M9 floor element');
    expect(within(table).getByText('M9')).toBeTruthy();
    expect(within(table).getByText('4 pax')).toBeTruthy();
    expect(table.querySelector('svg[data-table-svg="long"]')).toBeTruthy();
  });
});
