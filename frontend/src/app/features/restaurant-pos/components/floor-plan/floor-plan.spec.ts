import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { FloorElement } from '../../models/restaurant-pos.models';
import {
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  MOCK_FLOOR_ELEMENTS,
  MOCK_RESTAURANT_TABLES,
} from '../../state/restaurant-pos.mock-data';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { FloorPlan } from './floor-plan';

type FloorPlanDragHarness = {
  evaluateCanvasOverflow: () => void;
  handleCanvasPointerDown: (event: PointerEvent) => void;
  handleCanvasPointerMove: (event: PointerEvent) => void;
  handleCanvasPointerUp: (event: PointerEvent) => void;
  handleDragMoved: (event: { pointerPosition: { x: number; y: number } }) => void;
  handleDragEnded: (event: { distance: { x: number; y: number }; source: { getRootElement: () => HTMLElement; reset: () => void } }, element: FloorElement) => void;
};

const setElementSize = (
  element: HTMLElement,
  size: {
    clientWidth: number;
    clientHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  },
) => {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: size.clientWidth },
    clientHeight: { configurable: true, value: size.clientHeight },
    scrollWidth: { configurable: true, value: size.scrollWidth },
    scrollHeight: { configurable: true, value: size.scrollHeight },
  });
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
  const renderFloorPlan = async (template: typeof FloorPlan | string = FloorPlan, options: any = {}) => {
    const i18n = provideI18nTesting('en');
    const renderOptions = {
      ...options,
      imports: [...(options.imports ?? []), ...i18n.imports],
      providers: [...(options.providers ?? []), ...i18n.providers],
    };

    const result = await (typeof template === 'string'
      ? render(template, renderOptions)
      : render(template, renderOptions));
    const store = result.fixture.debugElement.injector.get(RestaurantPosStore);

    store.hydrateLayout({
      floorId: 'floor-main',
      floorName: 'Sala principal',
      rows: DEFAULT_GRID_ROWS,
      columns: DEFAULT_GRID_COLUMNS,
      floorElements: MOCK_FLOOR_ELEMENTS,
      restaurantTables: MOCK_RESTAURANT_TABLES,
    });
    result.fixture.detectChanges();

    return result;
  };

  it('renders floor elements as restaurant plan objects', async () => {
    await renderFloorPlan();

    expect(screen.getByLabelText('M1 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Bar floor element')).toBeTruthy();
    expect(screen.getByLabelText('Kitchen floor element')).toBeTruthy();
    expect(screen.getByLabelText('Entrance floor element')).toBeTruthy();
  });

  it('renders the floor matrix with stronger grid and cell borders', async () => {
    await renderFloorPlan();

    const matrix = screen.getByLabelText('Floor plan matrix');
    expect(matrix.getAttribute('style')).toContain('grid-template-columns: repeat(20, 2.75rem)');
    expect(matrix.getAttribute('style')).toContain('grid-template-rows: repeat(20, 2.75rem)');
    expect(matrix.className).toContain('floor-plan-theme-matrix');
    expect(matrix.className).not.toContain('linear-gradient');
    expect(matrix.className).not.toContain('bg-[length:');
    expect(screen.getByLabelText('Cell 0, 0').className).toContain('floor-plan-theme-cell');
  });

  it('uses the inner matrix border as the placement boundary without extra inner padding', async () => {
    await renderFloorPlan();

    const matrix = screen.getByLabelText('Floor plan matrix');
    expect(matrix.className.split(' ')).not.toContain('p-2');
    expect(matrix.className.split(' ')).toContain('overflow-visible');
    expect(matrix.className.split(' ')).not.toContain('overflow-hidden');
    expect(matrix.className).toContain('floor-plan-theme-matrix');
  });

  it('keeps the outer canvas compact while leaving room for the selected toolbar', async () => {
    await renderFloorPlan();

    const canvas = screen.getByLabelText('Floor plan canvas');
    expect(canvas.className.split(' ')).toContain('grid');
    expect(canvas.className.split(' ')).toContain('place-items-center');
    expect(canvas.className.split(' ')).toContain('overflow-auto');
    expect(canvas.hasAttribute('cdkscrollable')).toBe(true);
    expect(canvas.className.split(' ')).not.toContain('overflow-x-auto');
    expect(canvas.className).toContain('pt-10');
    expect(canvas.className.split(' ')).not.toContain('pt-20');
  });

  it('shows a temporary hand hint when the canvas has scrollable overflow', async () => {
    vi.useFakeTimers();
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas');

    setElementSize(canvas, { clientWidth: 300, clientHeight: 240, scrollWidth: 640, scrollHeight: 520 });
    (fixture.componentInstance as unknown as FloorPlanDragHarness).evaluateCanvasOverflow();
    fixture.detectChanges();

    expect(screen.getByLabelText('Scrollable floor plan hint')).toBeTruthy();
    expect(screen.getByText('pan_tool_alt')).toBeTruthy();

    vi.advanceTimersByTime(3500);
    fixture.detectChanges();

    expect(screen.queryByLabelText('Scrollable floor plan hint')).toBeNull();
    vi.useRealTimers();
  });

  it('does not show the hand hint when the canvas fits without overflow', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas');

    setElementSize(canvas, { clientWidth: 640, clientHeight: 520, scrollWidth: 640, scrollHeight: 520 });
    (fixture.componentInstance as unknown as FloorPlanDragHarness).evaluateCanvasOverflow();
    fixture.detectChanges();

    expect(screen.queryByLabelText('Scrollable floor plan hint')).toBeNull();
  });

  it('rechecks overflow when the layout grows to a 20 by 20 matrix', async () => {
    vi.useFakeTimers();
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas');
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    setElementSize(canvas, { clientWidth: 300, clientHeight: 240, scrollWidth: 1600, scrollHeight: 1600 });
    store.setGridSize(20, 20);
    fixture.detectChanges();
    vi.runOnlyPendingTimers();
    fixture.detectChanges();

    expect(canvas.className).toContain('cursor-grab');
    expect(screen.getByLabelText('Scrollable floor plan hint')).toBeTruthy();
    vi.useRealTimers();
  });

  it('lets the user pan the empty matrix when the canvas has overflow', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    setElementSize(canvas, { clientWidth: 300, clientHeight: 240, scrollWidth: 1200, scrollHeight: 1200 });
    Object.defineProperties(canvas, {
      scrollLeft: { configurable: true, writable: true, value: 80 },
      scrollTop: { configurable: true, writable: true, value: 60 },
    });
    Object.defineProperty(canvas, 'setPointerCapture', { configurable: true, value: vi.fn() });
    Object.defineProperty(canvas, 'releasePointerCapture', { configurable: true, value: vi.fn() });

    (fixture.componentInstance as unknown as FloorPlanDragHarness).evaluateCanvasOverflow();
    fixture.detectChanges();

    expect(canvas.className).toContain('cursor-grab');

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleCanvasPointerDown(
      new PointerEvent('pointerdown', { button: 0, clientX: 220, clientY: 180, pointerId: 1 }),
    );
    fixture.detectChanges();
    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleCanvasPointerMove(
      new PointerEvent('pointermove', { clientX: 180, clientY: 150, pointerId: 1 }),
    );

    expect(canvas.scrollLeft).toBe(120);
    expect(canvas.scrollTop).toBe(90);
    expect(canvas.className).toContain('cursor-grabbing');

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleCanvasPointerUp(new PointerEvent('pointerup', { pointerId: 1 }));
    fixture.detectChanges();

    expect(canvas.className).toContain('cursor-grab');
  });

  it('does not start canvas panning from a floor element', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    const element = screen.getByLabelText('M1 floor element');
    setElementSize(canvas, { clientWidth: 300, clientHeight: 240, scrollWidth: 1200, scrollHeight: 1200 });
    Object.defineProperties(canvas, {
      scrollLeft: { configurable: true, writable: true, value: 80 },
      scrollTop: { configurable: true, writable: true, value: 60 },
    });
    Object.defineProperty(canvas, 'setPointerCapture', { configurable: true, value: vi.fn() });

    (fixture.componentInstance as unknown as FloorPlanDragHarness).evaluateCanvasOverflow();
    const pointerDown = new PointerEvent('pointerdown', { button: 0, clientX: 220, clientY: 180, pointerId: 1, bubbles: true });
    Object.defineProperty(pointerDown, 'target', { configurable: true, value: element });
    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleCanvasPointerDown(pointerDown);

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleCanvasPointerMove(
      new PointerEvent('pointermove', { clientX: 180, clientY: 150, pointerId: 1 }),
    );

    expect(canvas.scrollLeft).toBe(80);
    expect(canvas.scrollTop).toBe(60);
  });

  it('keeps selected elements and their toolbar above the matrix without clipping overlays', async () => {
    await renderFloorPlan();

    const element = screen.getByLabelText('M1 floor element');
    expect(element.className.split(' ')).toContain('p-0.5');
    expect(element.className.split(' ')).not.toContain('p-2');

    fireEvent.click(element);

    expect(element.className.split(' ')).toContain('z-40');
    expect(screen.getByRole('toolbar', { name: 'Layout element actions' }).className.split(' ')).toContain('z-50');
  });

  it('shows a subtle footprint border for the occupied element size', async () => {
    await renderFloorPlan();

    const element = screen.getByLabelText('M1 floor element');
    expect(element.className.split(' ')).toContain('floor-plan-theme-element');

    fireEvent.click(element);

    expect(element.className.split(' ')).toContain('floor-plan-theme-element-selected');
    expect(element.className).toContain('ring-cyan-500');
  });

  it('uses a tighter inset for small table visuals so the object reads larger inside the footprint', async () => {
    await renderFloorPlan();

    expect(screen.getByLabelText('M1 floor element').getAttribute('style')).toContain('grid-column: 2 / span 2');
    expect(screen.getByLabelText('M1 floor element').getAttribute('style')).toContain('grid-row: 2 / span 2');
    expect(screen.getAllByLabelText('Table shape rectangle')[0].className.split(' ')).toContain('inset-0');
  });

  it('renders the default bar one cell longer with three independent stools above it', async () => {
    await renderFloorPlan();

    const bar = screen.getByLabelText('Bar floor element');
    const barObject = screen.getByLabelText('Bar object');
    const barCapsule = barObject.firstElementChild as HTMLElement;

    expect(bar.getAttribute('style')).toContain('grid-column: 2 / span 3');
    expect(barObject.className.split(' ')).toContain('h-full');
    expect(barObject.className.split(' ')).toContain('w-full');
    expect(barCapsule.className.split(' ')).toContain('h-full');
    expect(barCapsule.className.split(' ')).toContain('w-full');
    expect(barCapsule.className.split(' ')).toContain('rounded-full');
    expect(within(barCapsule).getByText('Bar').className).not.toContain('floor-plan-zone-label--vertical');
    expect(screen.queryByLabelText('Bar stools')).toBeNull();
    expect(screen.getByLabelText('Stool 1 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Stool 2 floor element')).toBeTruthy();
    expect(screen.getByLabelText('Stool 3 floor element')).toBeTruthy();
    expect(within(screen.getByLabelText('Stool 1 object')).getByText('T1')).toBeTruthy();
    expect(within(screen.getByLabelText('Stool 2 object')).getByText('T2')).toBeTruthy();
    expect(within(screen.getByLabelText('Stool 3 object')).getByText('T3')).toBeTruthy();
  });

  it('renders a vertical bar as a tall capsule that fills its footprint height', async () => {
    const { fixture } = await renderFloorPlan();
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
    expect(within(barCapsule).getByText('Vertical bar').className).toContain('floor-plan-zone-label--vertical');
  });

  it('uses compact visual labels for stools while keeping accessible names complete', async () => {
    const { fixture } = await renderFloorPlan();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.addFloorElement({ type: 'stool', label: 'Stool', x: 5, y: 4, width: 1, height: 1 });
    store.addFloorElement({ type: 'stool', label: 'Custom stool label', x: 6, y: 4, width: 1, height: 1 });
    fixture.detectChanges();

    expect(screen.getAllByLabelText('Stool floor element').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Custom stool label floor element')).toBeTruthy();
    expect(within(screen.getAllByLabelText('Stool object')[0]).getByText('T')).toBeTruthy();
    expect(within(screen.getByLabelText('Custom stool label object')).getByText('Custom stool label')).toBeTruthy();
  });

  it('selects a floor element and shows one contextual toolbar in layout mode', async () => {
    await renderFloorPlan();

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
    await renderFloorPlan();

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    expect(screen.getByRole('button', { name: 'Edit M1' })).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Bar floor element'));

    expect(screen.queryByRole('button', { name: 'Edit M1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Bar' })).toBeTruthy();
  });

  it('does not render edit, move, or delete controls inside every element', async () => {
    await renderFloorPlan();

    expect(screen.queryByRole('button', { name: 'Edit M1' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete M1' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move M1' })).toBeNull();
  });

  it('emits the selected element when clicking Edit', async () => {
    const editElement = vi.fn();
    await renderFloorPlan('<app-floor-plan (editElement)="editElement($event)" />', {
      imports: [FloorPlan],
      componentProperties: { editElement },
    });

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit M1' }));

    expect(editElement).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1' }));
  });

  it('emits the selected element when clicking Resize', async () => {
    const resizeElement = vi.fn();
    await renderFloorPlan('<app-floor-plan (resizeElement)="resizeElement($event)" />', {
      imports: [FloorPlan],
      componentProperties: { resizeElement },
    });

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Resize M1' }));

    expect(resizeElement).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1' }));
  });

  it('asks for confirmation and emits the element to delete without mutating the store itself', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { fixture } = await renderFloorPlan();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const elementDeleted = vi.fn();
    (fixture.componentInstance as FloorPlan).elementDeleted.subscribe(elementDeleted);

    fireEvent.click(screen.getByLabelText('M1 floor element'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete M1' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this element from the layout?');
    expect(elementDeleted).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1' }));
    expect(store.floorElements().some((element) => element.id === 'floor-element-1')).toBe(true);
  });

  it('allows moving the selected element from the object or the move toolbar action', async () => {
    await renderFloorPlan();

    fireEvent.click(screen.getByLabelText('M1 floor element'));

    expect(screen.getByLabelText('M1 floor element').hasAttribute('cdkdrag')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move M1' }).hasAttribute('cdkdraghandle')).toBe(true);
    expect(screen.getByLabelText('M1 floor element').querySelectorAll('[cdkdraghandle]').length).toBeGreaterThan(1);
  });

  it('uses a custom global drag preview and an empty matrix placeholder', async () => {
    await renderFloorPlan();

    const element = screen.getByLabelText('M1 floor element');

    expect(element.hasAttribute('cdkdragpreviewcontainer')).toBe(false);
    expect(element.getAttribute('cdkdragpreviewclass')).toBe('floor-plan-drag-preview');
  });

  it('clamps movement to the first valid cell when dragging past the top or left edge', async () => {
    const { fixture } = await renderFloorPlan();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const moveFloorElement = vi.spyOn(store, 'moveFloorElement').mockImplementation(() => undefined);
    const element = store.floorElements().find((floorElement) => floorElement.id === 'floor-element-1');
    const elementMoved = vi.fn();
    (fixture.componentInstance as FloorPlan).elementMoved.subscribe(elementMoved);

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragEnded(createDragEndEvent({ x: -250, y: -250 }), element!);

    expect(moveFloorElement).not.toHaveBeenCalled();
    expect(elementMoved).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1', x: 0, y: 0 }));
  });

  it('clamps movement to the last valid cell when dragging past the right or bottom edge', async () => {
    const { fixture } = await renderFloorPlan();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const moveFloorElement = vi.spyOn(store, 'moveFloorElement').mockImplementation(() => undefined);
    const element = store.floorElements().find((floorElement) => floorElement.id === 'floor-element-2');
    const elementMoved = vi.fn();
    (fixture.componentInstance as FloorPlan).elementMoved.subscribe(elementMoved);

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragEnded(createDragEndEvent({ x: 800, y: 800 }), element!);

    expect(moveFloorElement).not.toHaveBeenCalled();
    expect(elementMoved).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-2', x: 18, y: 18 }));
  });

  it('includes accumulated canvas scroll when placing a dragged element', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    Object.defineProperties(canvas, {
      scrollLeft: { configurable: true, writable: true, value: 0 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    canvas.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 240,
        top: 20,
        left: 10,
        right: 310,
        bottom: 260,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const moveFloorElement = vi.spyOn(store, 'moveFloorElement').mockImplementation(() => undefined);
    const element = store.floorElements().find((floorElement) => floorElement.id === 'floor-element-1');
    const elementMoved = vi.fn();
    (fixture.componentInstance as FloorPlan).elementMoved.subscribe(elementMoved);

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragMoved({ pointerPosition: { x: 150, y: 120 } });
    canvas.scrollLeft = 120;
    canvas.scrollTop = 120;
    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragEnded(createDragEndEvent({ x: 0, y: 0 }), element!);

    expect(moveFloorElement).not.toHaveBeenCalled();
    expect(elementMoved).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1', x: 5, y: 5 }));
  });

  it('auto-scrolls the canvas when dragging near the right or bottom edge', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    const scrollBy = vi.fn();
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    Object.defineProperty(canvas, 'scrollBy', { configurable: true, value: scrollBy });
    canvas.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 240,
        top: 20,
        left: 10,
        right: 310,
        bottom: 260,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragMoved({ pointerPosition: { x: 304, y: 254 } });
    const queuedFrame = animationFrames[0];
    if (!queuedFrame) {
      throw new Error('Expected auto-scroll to queue an animation frame.');
    }
    queuedFrame(0);

    expect(scrollBy).toHaveBeenCalledWith({ left: expect.any(Number), top: expect.any(Number), behavior: 'auto' });
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);
    expect(scrollBy.mock.calls[0][0].top).toBeGreaterThan(0);
  });

  it('does not manually rewrite the dragged element position during auto-scroll', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    const setFreeDragPosition = vi.fn();
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    Object.defineProperties(canvas, {
      scrollLeft: { configurable: true, writable: true, value: 40 },
      scrollTop: { configurable: true, writable: true, value: 20 },
      scrollBy: {
        configurable: true,
        value: ({ left, top }: ScrollToOptions) => {
          canvas.scrollLeft += Number(left ?? 0);
          canvas.scrollTop += Number(top ?? 0);
        },
      },
    });
    canvas.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 240,
        top: 20,
        left: 10,
        right: 310,
        bottom: 260,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragMoved({
      pointerPosition: { x: 304, y: 254 },
      source: {
        getFreeDragPosition: () => ({ x: 12, y: 8 }),
        setFreeDragPosition,
      },
    } as Parameters<FloorPlanDragHarness['handleDragMoved']>[0]);
    const queuedFrame = animationFrames[0];
    if (!queuedFrame) {
      throw new Error('Expected auto-scroll to queue an animation frame.');
    }
    queuedFrame(0);

    expect(setFreeDragPosition).not.toHaveBeenCalled();
  });

  it('keeps auto-scrolling after the dragged pointer passes outside the visible edge', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    const scrollBy = vi.fn();
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    Object.defineProperty(canvas, 'scrollBy', { configurable: true, value: scrollBy });
    canvas.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 240,
        top: 20,
        left: 10,
        right: 310,
        bottom: 260,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragMoved({ pointerPosition: { x: 340, y: 285 } });
    const queuedFrame = animationFrames[0];
    if (!queuedFrame) {
      throw new Error('Expected auto-scroll to queue an animation frame.');
    }
    queuedFrame(0);

    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);
    expect(scrollBy.mock.calls[0][0].top).toBeGreaterThan(0);
  });

  it('auto-scrolls both axes when dragging near a corner', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    const scrollBy = vi.fn();
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    Object.defineProperty(canvas, 'scrollBy', { configurable: true, value: scrollBy });
    canvas.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 240,
        top: 20,
        left: 10,
        right: 310,
        bottom: 260,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragMoved({ pointerPosition: { x: 14, y: 24 } });
    const queuedFrame = animationFrames[0];
    if (!queuedFrame) {
      throw new Error('Expected auto-scroll to queue an animation frame.');
    }
    queuedFrame(0);

    expect(scrollBy.mock.calls[0][0].left).toBeLessThan(0);
    expect(scrollBy.mock.calls[0][0].top).toBeLessThan(0);
  });

  it('stops auto-scroll when the drag ends', async () => {
    const { fixture } = await renderFloorPlan();
    const canvas = screen.getByLabelText('Floor plan canvas') as HTMLElement;
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42);
    Object.defineProperty(canvas, 'scrollBy', { configurable: true, value: vi.fn() });
    canvas.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 240,
        top: 20,
        left: 10,
        right: 310,
        bottom: 260,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const element = store.floorElements().find((floorElement) => floorElement.id === 'floor-element-2');

    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragMoved({ pointerPosition: { x: 304, y: 254 } });
    (fixture.componentInstance as unknown as FloorPlanDragHarness).handleDragEnded(createDragEndEvent({ x: 0, y: 0 }), element!);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('disables drag and hides the edit toolbar outside layout mode', async () => {
    await renderFloorPlan('<app-floor-plan [layoutMode]="false" />', { imports: [FloorPlan] });

    fireEvent.click(screen.getByLabelText('M1 table, Free'));

    expect(screen.getByLabelText('M1 table, Free').getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByRole('toolbar', { name: 'Layout element actions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move M1' })).toBeNull();
  });

  it('selects a stool as a one-person service point in service mode', async () => {
    const { fixture } = await renderFloorPlan('<app-floor-plan [layoutMode]="false" />', { imports: [FloorPlan] });
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('Stool 1 table, Free'));
    fixture.detectChanges();

    expect(store.selectedTableId()).toBe('stool-1');
    expect(screen.getByLabelText('Stool 1 table, Free').className).toContain('floor-plan-theme-element-selected');
    expect(within(screen.getByLabelText('Stool 1 table, Free')).getByText('T1')).toBeTruthy();
    expect(within(screen.getByLabelText('Stool 1 table, Free')).getByText('Selected')).toBeTruthy();
  });

  it('scrolls and focuses a requested service point in service mode', async () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    HTMLElement.prototype.focus = focus;

    await renderFloorPlan('<app-floor-plan [layoutMode]="false" [focusRequest]="focusRequest" />', {
      imports: [FloorPlan],
      componentProperties: { focusRequest: { elementId: 'floor-element-6', requestId: 1 } },
    });

    vi.runOnlyPendingTimers();

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'center', behavior: 'smooth' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.focus = originalFocus;
    vi.useRealTimers();
  });

  it('renders table status, total, and occupied time in service mode', async () => {
    const { fixture } = await renderFloorPlan('<app-floor-plan [layoutMode]="false" />', { imports: [FloorPlan] });
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    fixture.detectChanges();

    const table = screen.getByLabelText('M1 table, Occupied');
    expect(within(table).getByText('Occupied')).toBeTruthy();
    expect(within(table).getByText('€12.50')).toBeTruthy();
    expect(within(table).getByText(/2 pax/)).toBeTruthy();
  });

  it('renders table label and capacity without service state details in layout mode', async () => {
    await renderFloorPlan();

    expect(screen.getByText('M1')).toBeTruthy();
    expect(screen.getByText('2 pax')).toBeTruthy();
    expect(screen.queryByText(/free/i)).toBeNull();
    expect(screen.queryByText(/occupied/i)).toBeNull();
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.queryByText('12m')).toBeNull();
  });

  it('renders distinct bar, kitchen, entrance, bathroom, stool, and blocked objects', async () => {
    const { fixture } = await renderFloorPlan();
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
    const { fixture } = await renderFloorPlan();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.addFloorElement({ type: 'table', label: 'M9', x: 4, y: 4, width: 3, height: 2, shape: 'long' });
    fixture.detectChanges();

    const table = screen.getByLabelText('M9 floor element');
    expect(within(table).getByText('M9')).toBeTruthy();
    expect(within(table).getByText('4 pax')).toBeTruthy();
    expect(table.querySelector('svg[data-table-svg="long"]')).toBeTruthy();
  });
});
