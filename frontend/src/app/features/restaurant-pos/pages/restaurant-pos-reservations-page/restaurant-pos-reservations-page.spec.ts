import { signal } from '@angular/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { ToastService } from '../../../../shared/ui/toast/toast';
import type { RestaurantFloorsDto, RestaurantReservationDto } from '../../api/restaurant-pos-api.models';
import type { ServiceWindowDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosReservationsPage } from './restaurant-pos-reservations-page';

describe('RestaurantPosReservationsPage', () => {
  function formatDateForInput(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  function todayAt(hours: number, minutes: number): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0).toISOString();
  }

  function relativeDayAt(offset: number, hours: number, minutes: number): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, hours, minutes, 0, 0).toISOString();
  }

  const updateReservationStatus = (
    reservation: RestaurantReservationDto,
    status: RestaurantReservationDto['status'],
  ): RestaurantReservationDto => ({
    ...reservation,
    status,
  });

  const createReservationDto = (): RestaurantReservationDto => ({
    id: 'reservation-created',
    customerId: null,
    customerNameSnapshot: 'Marina Soler',
    customerPhoneSnapshot: '+34 600 777 888',
    partySize: 4,
    reservationAt: todayAt(13, 30),
    durationMinutes: 90,
    status: 'pending',
    notes: 'Ventana',
    tableIds: ['table-2'],
    tables: [{ id: 'table-2', tableNumber: 2, name: 'Mesa 2' }],
  });

  const demoServiceWindows: ServiceWindowDto[] = [
    { id: 'sw-lunch', restaurantId: 'restaurant-mesaflow-centro', name: 'Comidas', startTime: '12:00', endTime: '16:30', sortOrder: 1 },
    { id: 'sw-dinner', restaurantId: 'restaurant-mesaflow-centro', name: 'Cenas', startTime: '20:00', endTime: '23:30', sortOrder: 2 },
  ];

  const createApiMock = (): Pick<
    RestaurantPosApiService,
      | 'listRestaurants'
      | 'getRestaurantFloors'
      | 'getRestaurantReservations'
      | 'getRestaurantServiceWindows'
      | 'updateRestaurantServiceWindows'
      | 'createRestaurantReservation'
      | 'confirmRestaurantReservation'
      | 'seatRestaurantReservation'
      | 'markRestaurantReservationNoShow'
      | 'cancelRestaurantReservation'
      | 'searchCustomers'
  > => {
    const reservations: RestaurantReservationDto[] = [
      {
        id: 'reservation-demo-lunch',
        customerId: 'customer-laura',
        customerNameSnapshot: 'Laura Gomez',
        customerPhoneSnapshot: '+34 600 111 222',
        partySize: 2,
        reservationAt: todayAt(13, 30),
        durationMinutes: 90,
        status: 'confirmed',
        notes: 'Mesa tranquila.',
        tableIds: ['table-1'],
        tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
      },
      {
        id: 'reservation-demo-group',
        customerId: 'customer-diego',
        customerNameSnapshot: 'Diego Martin',
        customerPhoneSnapshot: '+34 600 333 444',
        partySize: 8,
        reservationAt: todayAt(20, 30),
        durationMinutes: 120,
        status: 'pending',
        notes: 'Grupo de cena de empresa.',
        tableIds: [],
        tables: [],
      },
    ];
    const floors: RestaurantFloorsDto = {
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [
        { id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true },
        { id: 'table-2', tableNumber: 2, name: 'Mesa 2', capacity: 4, isActive: true },
        { id: 'stool-1', tableNumber: 3, name: 'Taburete 1', capacity: 1, isActive: true },
        { id: 'stool-2', tableNumber: 4, name: 'Taburete 2', capacity: 1, isActive: true },
      ],
      floors: [{
        id: 'floor-main',
        name: 'Sala principal',
        rows: 10,
        columns: 10,
        elements: [
          { id: 'element-table-1', type: 'table', label: 'Mesa 1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1', shape: 'round', sortOrder: 1 },
          { id: 'element-table-2', type: 'table', label: 'Mesa 2', x: 4, y: 1, width: 2, height: 2, tableId: 'table-2', shape: 'square', sortOrder: 2 },
          { id: 'element-stool-1', type: 'stool', label: 'Taburete 1', x: 1, y: 4, width: 1, height: 1, tableId: 'stool-1', shape: null, sortOrder: 3 },
          { id: 'element-stool-2', type: 'stool', label: 'Taburete 2', x: 2, y: 4, width: 1, height: 1, tableId: 'stool-2', shape: null, sortOrder: 4 },
        ],
      }],
    };

    return ({
      listRestaurants: vi.fn(() =>
        of([
          {
            id: 'restaurant-mesaflow-centro',
            organizationId: 'org-demo',
            name: 'MesaFlow Centro',
            displayName: 'MesaFlow Centro',
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            isActive: true,
          },
        ]),
      ),
      getRestaurantFloors: vi.fn(() => of(floors)),
      getRestaurantReservations: vi.fn(() => of(reservations)),
      getRestaurantServiceWindows: vi.fn(() => of(demoServiceWindows)),
      updateRestaurantServiceWindows: vi.fn(() => of(demoServiceWindows)),
      searchCustomers: vi.fn(() => of([])),
      createRestaurantReservation: vi.fn(() => of(createReservationDto())),
      confirmRestaurantReservation: vi.fn(() => of(updateReservationStatus(reservations[1]!, 'confirmed'))),
      seatRestaurantReservation: vi.fn(() => of(updateReservationStatus(reservations[0]!, 'seated'))),
      markRestaurantReservationNoShow: vi.fn(() => of(updateReservationStatus(reservations[1]!, 'no_show'))),
      cancelRestaurantReservation: vi.fn(() => of(updateReservationStatus(reservations[1]!, 'cancelled'))),
    });
  };

  it('shows recommended slots and suggested tables in the creation flow', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    const component = fixture.componentInstance as unknown as {
      openCreateReservation(): void;
      updateCreateField(field: 'customerNameSnapshot' | 'partySize', value: string | number): void;
      recommendedSlots(): string[];
      suggestedTables(): Array<{ id: string; fit: string }>;
      manualTables(): Array<{ id: string }>;
    };

    component.openCreateReservation();
    component.updateCreateField('customerNameSnapshot', 'Marina Soler');
    component.updateCreateField('partySize', 4);
    fixture.detectChanges();

    expect(component.recommendedSlots().length).toBeGreaterThan(0);
    expect(component.suggestedTables()[0]).toEqual(expect.objectContaining({ id: 'table-2' }));
    expect(component.manualTables().map((table) => table.id)).toEqual(['table-1', 'table-2', 'stool-1', 'stool-2']);
  });

  it('keeps stools as a secondary suggestion for two guests and allows selecting them as a pair', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });
    const component = fixture.componentInstance as unknown as {
      openCreateReservation(): void;
      updateCreateField(field: 'customerNameSnapshot' | 'partySize', value: string | number): void;
      suggestedTables(): Array<{ id: string; kind: string; label: string; tableIds: string[] }>;
    };

    component.openCreateReservation();
    component.updateCreateField('customerNameSnapshot', 'Marina Soler');
    component.updateCreateField('partySize', 2);
    fixture.detectChanges();

    const suggestions = component.suggestedTables();
    expect(suggestions[0]).toEqual(expect.objectContaining({ id: 'table-1', kind: 'table' }));
    expect(suggestions.at(-1)).toEqual(expect.objectContaining({ id: 'stool-combo-2', kind: 'stool_combo' }));

    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    fireEvent.click(within(drawer).getByRole('checkbox', { name: /2 taburetes/i }));

    expect(within(drawer).getByText('Taburetes x2')).toBeTruthy();
  });

  it('keeps all tables available in the manual fallback without duplicate accessible controls', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });

    fireEvent.click(within(drawer).getByText('Todas las mesas'));

    expect(within(drawer).getAllByRole('checkbox', { name: /Mesa 1/ })).toHaveLength(1);
    expect(within(drawer).getAllByRole('checkbox', { name: /Mesa 2/ })).toHaveLength(1);
  });

  it('shows suggested tables with fit labels and contextual capacity guidance', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.input(screen.getByLabelText('Comensales'), { target: { value: '4' } });

    expect(screen.getByText('Mesas sugeridas')).toBeTruthy();
    expect(screen.getByText('Encaje ideal')).toBeTruthy();

    const component = fixture.componentInstance as unknown as {
      toggleCreateTable(tableId: string, checked: boolean): void;
      selectedTablesCapacity(): number | null;
      capacityWarningDescription(): string;
    };
    component.toggleCreateTable('table-1', true);
    fixture.detectChanges();

    expect(component.selectedTablesCapacity()).toBe(2);
    expect(screen.getByText(component.capacityWarningDescription())).toBeTruthy();
  });

  it('renders a service occupancy strip above the reservation lists', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    const occupancyStrip = screen.getByLabelText('Carga por servicio');
    expect(within(occupancyStrip).getByText('Comidas')).toBeTruthy();
    expect(within(occupancyStrip).getByText('Cenas')).toBeTruthy();
  });

  it('keeps service occupancy based on all day reservations when agenda filters change', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });
    const component = fixture.componentInstance as unknown as {
      statusFilter: { set(value: 'pending'): void };
    };
    const occupancyStrip = screen.getByLabelText('Carga por servicio');
    const lunchCard = within(occupancyStrip).getByText('Comidas').closest('article');
    const dinnerCard = within(occupancyStrip).getByText('Cenas').closest('article');

    component.statusFilter.set('pending');
    fixture.detectChanges();

    expect(within(lunchCard as HTMLElement).getByText('1 reserva')).toBeTruthy();
    expect(within(dinnerCard as HTMLElement).getByText('1 reserva')).toBeTruthy();
  });

  it('localizes occupancy and table-fit labels', async () => {
    const i18n = provideI18nTesting('en');
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(screen.getByLabelText('Service load')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'New reservation' }));

    expect(screen.getAllByText('Ideal fit').length).toBeGreaterThan(0);
  });

  it('derives the guided CTA from every required field while keeping tables optional', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    const component = fixture.componentInstance as unknown as {
      updateCreateField(field: 'customerNameSnapshot' | 'partySize' | 'time', value: string | number): void;
      toggleCreateTable(tableId: string, checked: boolean): void;
      creationProgressState(): { ctaLabelKey: string };
    };

    expect(component.creationProgressState().ctaLabelKey).toBe('restaurantPos.reservations.create.cta.selectCustomer');

    component.updateCreateField('customerNameSnapshot', 'Marina Soler');
    component.updateCreateField('partySize', 0);
    expect(component.creationProgressState().ctaLabelKey).toBe('restaurantPos.reservations.create.cta.selectPartySize');

    component.updateCreateField('partySize', 2);
    component.updateCreateField('time', '');
    expect(component.creationProgressState().ctaLabelKey).toBe('restaurantPos.reservations.create.cta.selectTime');

    component.updateCreateField('time', '13:30');
    expect(component.creationProgressState().ctaLabelKey).toBe('restaurantPos.reservations.create.cta.optionalTable');

    component.toggleCreateTable('table-1', true);
    expect(component.creationProgressState().ctaLabelKey).toBe('restaurantPos.reservations.create.submit');
  });

  it('renders the reservations day agenda grouped by service', async () => {
    const i18n = provideI18nTesting();
    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: createApiMock() }],
    });

    expect(screen.getByRole('heading', { name: 'Agenda de reservas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Comidas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cenas' })).toBeTruthy();
    expect(screen.getByText('Laura Gomez')).toBeTruthy();
    expect(screen.getByText('Mesa 1')).toBeTruthy();
    expect(screen.getByText('Diego Martin')).toBeTruthy();
    expect(screen.getByText('Sin mesa asignada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Cancelar' }).length).toBeGreaterThan(0);
  });

  it('shows a day-level empty state when there are no reservations for the selected day', async () => {
    const i18n = provideI18nTesting();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn(() => of([])),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(screen.getByText('Sin reservas para este día')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Comidas' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Cenas' })).toBeNull();
  });

  it('filters reservations by search text and status', async () => {
    const i18n = provideI18nTesting();
    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: createApiMock() }],
    });

    fireEvent.input(screen.getByLabelText('Buscar reserva'), { target: { value: 'diego' } });

    expect(screen.getByText('Diego Martin')).toBeTruthy();
    expect(screen.queryByText('Laura Gomez')).toBeNull();

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'pending' } });

    expect(screen.getByText('Diego Martin')).toBeTruthy();
    expect(screen.queryByText('Laura Gomez')).toBeNull();
  });

  it('refreshes the agenda after confirming one reservation', async () => {
    const i18n = provideI18nTesting();
    const reservationsByCall: RestaurantReservationDto[][] = [
      [
        {
          id: 'reservation-demo-group',
          customerId: 'customer-diego',
          customerNameSnapshot: 'Diego Martin',
          customerPhoneSnapshot: '+34 600 333 444',
          partySize: 8,
          reservationAt: todayAt(20, 30),
          durationMinutes: 120,
          status: 'pending',
          notes: 'Grupo de cena de empresa.',
          tableIds: [],
          tables: [],
        },
      ],
      [
        {
          id: 'reservation-demo-group',
          customerId: 'customer-diego',
          customerNameSnapshot: 'Diego Martin',
          customerPhoneSnapshot: '+34 600 333 444',
          partySize: 8,
          reservationAt: todayAt(20, 30),
          durationMinutes: 120,
          status: 'confirmed',
          notes: 'Grupo de cena de empresa.',
          tableIds: [],
          tables: [],
        },
      ],
    ];
    const apiMock = {
      listRestaurants: vi.fn(() =>
        of([
          {
            id: 'restaurant-mesaflow-centro',
            organizationId: 'org-demo',
            name: 'MesaFlow Centro',
            displayName: 'MesaFlow Centro',
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            isActive: true,
          },
        ]),
      ),
      getRestaurantFloors: vi.fn(() =>
        of({
          restaurantId: 'restaurant-mesaflow-centro',
          tables: [],
          floors: [],
        }),
      ),
      getRestaurantReservations: vi.fn(() => of(reservationsByCall.shift() ?? [])),
      getRestaurantServiceWindows: vi.fn(() => of(demoServiceWindows)),
      updateRestaurantServiceWindows: vi.fn(() => of(demoServiceWindows)),
      createRestaurantReservation: vi.fn(() => of(createReservationDto())),
      confirmRestaurantReservation: vi.fn(() =>
        of({
          id: 'reservation-demo-group',
          customerId: 'customer-diego',
          customerNameSnapshot: 'Diego Martin',
          customerPhoneSnapshot: '+34 600 333 444',
          partySize: 8,
          reservationAt: todayAt(20, 30),
          durationMinutes: 120,
          status: 'confirmed' as const,
          notes: 'Grupo de cena de empresa.',
          tableIds: [],
          tables: [],
        }),
      ),
      seatRestaurantReservation: vi.fn(),
      markRestaurantReservationNoShow: vi.fn(),
      cancelRestaurantReservation: vi.fn(),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(apiMock.confirmRestaurantReservation).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'reservation-demo-group',
    );
    const dinnerSection = screen.getByRole('region', { name: 'Cenas' });
    expect(await within(dinnerSection).findByText('Confirmada')).toBeTruthy();
    expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2);
  });

  it('shows an error message when one reservation action fails', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    apiMock.confirmRestaurantReservation = vi.fn(() => throwError(() => new Error('boom')));

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('No se ha podido actualizar la reserva.')).toBeTruthy();
  });

  it('opens the new reservation form and creates one reservation using local date and time', async () => {
    const i18n = provideI18nTesting();
    const reservationsByCall: RestaurantReservationDto[][] = [
      [],
      [createReservationDto()],
    ];
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn(() => of(reservationsByCall.shift() ?? [])),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: '+34 600 777 888' } });
    fireEvent.input(screen.getByLabelText('Comensales'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('radio', { name: '13:30' }));
    fireEvent.click(screen.getAllByLabelText('Mesa 2', { exact: false })[0]!);
    fireEvent.input(screen.getByLabelText('Notas'), { target: { value: 'Ventana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar reserva' }));

    expect(apiMock.createRestaurantReservation).toHaveBeenCalledWith('restaurant-mesaflow-centro', {
      customerNameSnapshot: 'Marina Soler',
      customerPhoneSnapshot: '+34 600 777 888',
      partySize: 4,
      reservationAt: todayAt(13, 30),
      durationMinutes: 90,
      notes: 'Ventana',
      tableIds: ['table-2'],
    });
    expect(await screen.findByText('Marina Soler')).toBeTruthy();
    expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2);
  });

  it('lets the creation flow book a reservation for a different day than the active agenda date', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const tomorrow = formatDateForInput(new Date(Date.now() + 24 * 60 * 60 * 1000));

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.input(screen.getByLabelText('Fecha'), { target: { value: tomorrow } });
    fireEvent.click(screen.getByRole('radio', { name: '13:30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }));

    expect(apiMock.createRestaurantReservation).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      expect.objectContaining({ reservationAt: new Date(`${tomorrow}T13:30:00`).toISOString() }),
    );
  });

  it('keeps the create flow available without selecting a table', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.click(screen.getByRole('radio', { name: '13:30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }));

    expect(apiMock.createRestaurantReservation).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      expect.objectContaining({ tableIds: [] }),
    );
  });

  it('keeps focus in the drawer after confirming an over-capacity reservation while submission disables its opener', async () => {
    const i18n = provideI18nTesting();
    const createSubject = new Subject<RestaurantReservationDto>();
    const apiMock = {
      ...createApiMock(),
      createRestaurantReservation: vi.fn(() => createSubject.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    fireEvent.input(within(drawer).getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.input(within(drawer).getByLabelText('Comensales'), { target: { value: '4' } });
    fireEvent.click(within(drawer).getByRole('checkbox', { name: /Mesa 1/ }));
    const submitButton = within(drawer).getByRole('button', { name: 'Guardar reserva' });
    submitButton.focus();
    fireEvent.click(submitButton);

    const capacityWarning = screen.getAllByRole('dialog').find((dialog) => dialog !== drawer)!;
    await waitFor(() => expect(capacityWarning.contains(document.activeElement)).toBe(true));
    fireEvent.click(within(capacityWarning).getAllByRole('button').at(-1)!);

    expect(apiMock.createRestaurantReservation).toHaveBeenCalledTimes(1);
    expect(within(drawer).getByRole('button', { name: 'Guardar reserva' }).hasAttribute('disabled')).toBe(true);
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));
    expect((document.activeElement as HTMLElement).hasAttribute('disabled')).toBe(false);
  });

  it('prevents closing or reopening the drawer while a reservation creation is still submitting', async () => {
    const i18n = provideI18nTesting();
    const createSubject = new Subject<RestaurantReservationDto>();
    const apiMock = {
      ...createApiMock(),
      createRestaurantReservation: vi.fn(() => createSubject.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    const opener = screen.getByRole('button', { name: 'Nueva reserva' });
    fireEvent.click(opener);

    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    fireEvent.input(within(drawer).getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }));

    expect(apiMock.createRestaurantReservation).toHaveBeenCalledTimes(1);
    expect(opener.hasAttribute('disabled')).toBe(true);

    fireEvent.click(within(drawer).getByRole('button', { name: 'Cerrar dialogo' }));
    fireEvent.click(drawer.closest('.dialog')?.querySelector('.dialog__backdrop') as HTMLElement);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(opener);

    expect(screen.getByRole('dialog', { name: 'Crear reserva' })).toBeTruthy();
    expect(apiMock.createRestaurantReservation).toHaveBeenCalledTimes(1);

    createSubject.next(createReservationDto());
    createSubject.complete();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Crear reserva' })).toBeNull());
  });

  it('provides translation entries for the drawer guidance labels', () => {
    const i18n = provideI18nTesting();
    const reservationsEs = (i18n.translations.es.restaurantPos.reservations as unknown as Record<string, string | Record<string, string>>);
    const reservationsCa = (i18n.translations.ca.restaurantPos.reservations as unknown as Record<string, string | Record<string, string>>);

    expect(i18n.translations.es.restaurantPos.reservations.create.cta.selectTime).toBeTruthy();
    expect(i18n.translations.es.restaurantPos.reservations.create.suggestedTables).toBeTruthy();
    expect(i18n.translations.es.restaurantPos.reservations.occupancyHeading).toBe('Resumen de ocupación');
    expect(reservationsEs['occupancyReservationsOne']).toContain('reserva');
    expect(i18n.translations.en.restaurantPos.reservations.create.tableTitle).toBe('Table');
    expect(i18n.translations.en.restaurantPos.reservations.create.manualTables).toBe('All tables');
    expect(reservationsCa['occupancyUpcomingOther']).toContain('pròxim');
    expect(i18n.translations.ca.restaurantPos.reservations.create.tableTitle).toBe('Taula');
    expect(i18n.translations.ca.restaurantPos.reservations.create.manualTables).toBe('Totes les taules');
  });

  it('shows validation when the customer name is empty', async () => {
    const i18n = provideI18nTesting();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: createApiMock() }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecciona un cliente' }));

    expect(screen.getByText('Introduce el nombre del cliente.')).toBeTruthy();
    expect(within(screen.getByRole('contentinfo')).getByText('Introduce el nombre del cliente.')).toBeTruthy();
  });

  it('shows a loading spinner while reservations are being fetched', async () => {
    const i18n = provideI18nTesting();
    const subject = new Subject<RestaurantReservationDto[]>();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn(() => subject.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Comidas' })).toBeNull();
  });

  it('hides the occupancy strip while a date change reload is pending', async () => {
    const i18n = provideI18nTesting();
    const reloadSubject = new Subject<RestaurantReservationDto[]>();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn()
        .mockReturnValueOnce(of([
          {
            id: 'reservation-existing',
            customerId: null,
            customerNameSnapshot: 'Reserva anterior',
            customerPhoneSnapshot: null,
            partySize: 2,
            reservationAt: todayAt(13, 30),
            durationMinutes: 90,
            status: 'confirmed' as const,
            notes: null,
            tableIds: [],
            tables: [],
          },
        ]))
        .mockReturnValueOnce(reloadSubject.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(screen.getByLabelText('Carga por servicio')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByLabelText('Carga por servicio')).toBeNull();
  });

  it('keeps the newest date occupancy when overlapping date loads resolve out of order', async () => {
    const i18n = provideI18nTesting();
    const staleRequest = new Subject<RestaurantReservationDto[]>();
    const latestRequest = new Subject<RestaurantReservationDto[]>();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn()
        .mockReturnValueOnce(staleRequest.asObservable())
        .mockReturnValueOnce(latestRequest.asObservable()),
    };

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    await waitFor(() => expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2));
    latestRequest.next([{
      id: 'reservation-latest',
      customerId: null,
      customerNameSnapshot: 'Reserva vigente',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: relativeDayAt(-1, 13, 30),
      durationMinutes: 90,
      status: 'confirmed',
      notes: null,
      tableIds: [],
      tables: [],
    }]);
    latestRequest.complete();
    fixture.detectChanges();
    await waitFor(() => expect(screen.getByText('Reserva vigente')).toBeTruthy());
    staleRequest.next([{
      id: 'reservation-stale',
      customerId: null,
      customerNameSnapshot: 'Reserva obsoleta',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: relativeDayAt(-1, 13, 30),
      durationMinutes: 90,
      status: 'confirmed',
      notes: null,
      tableIds: [],
      tables: [],
    }]);
    fixture.detectChanges();

    expect(screen.getByText('Reserva vigente')).toBeTruthy();
    expect(screen.queryByText('Reserva obsoleta')).toBeNull();
  });

  it('keeps the newest date loading state and error clear when a stale load fails', async () => {
    const i18n = provideI18nTesting();
    const staleRequest = new Subject<RestaurantReservationDto[]>();
    const latestRequest = new Subject<RestaurantReservationDto[]>();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn()
        .mockReturnValueOnce(staleRequest.asObservable())
        .mockReturnValueOnce(latestRequest.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    await waitFor(() => expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2));
    staleRequest.error(new Error('stale network error'));

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hides the occupancy strip after a date reload fails', async () => {
    const i18n = provideI18nTesting();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn()
        .mockReturnValueOnce(of([
          {
            id: 'reservation-existing',
            customerId: null,
            customerNameSnapshot: 'Reserva anterior',
            customerPhoneSnapshot: null,
            partySize: 2,
            reservationAt: todayAt(13, 30),
            durationMinutes: 90,
            status: 'confirmed' as const,
            notes: null,
            tableIds: [],
            tables: [],
          },
        ]))
        .mockReturnValueOnce(throwError(() => new Error('network error'))),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(screen.getByLabelText('Carga por servicio')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByLabelText('Carga por servicio')).toBeNull();
  });

  it('shows an error alert and a retry button when the initial load fails', async () => {
    const i18n = provideI18nTesting();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn(() => throwError(() => new Error('network error'))),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Comidas' })).toBeNull();
  });

  it('retries the load when the retry button is clicked', async () => {
    const i18n = provideI18nTesting();
    const apiMock = {
      ...createApiMock(),
      getRestaurantReservations: vi.fn()
        .mockReturnValueOnce(throwError(() => new Error('boom')))
        .mockReturnValueOnce(of([])),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables action buttons and shows an inline spinner while the action processes', async () => {
    const i18n = provideI18nTesting();
    const subject = new Subject<RestaurantReservationDto>();
    const apiMock = {
      ...createApiMock(),
      confirmRestaurantReservation: vi.fn(() => subject.asObservable()),
    };

    const { container } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(screen.getByRole('button', { name: 'Confirmar' }).hasAttribute('disabled')).toBe(true);
    expect(container.querySelector('.spinner')).toBeTruthy();
  });

  it('does not refresh the previous date when an action completes after navigating dates', async () => {
    const i18n = provideI18nTesting();
    const actionResponse = new Subject<RestaurantReservationDto>();
    const apiMock = {
      ...createApiMock(),
      confirmRestaurantReservation: vi.fn(() => actionResponse.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
    await waitFor(() => expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2));

    actionResponse.next(createReservationDto());

    expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2);
  });

  it('does not refresh the previous restaurant when an action completes after switching restaurants', async () => {
    const i18n = provideI18nTesting();
    const actionResponse = new Subject<RestaurantReservationDto>();
    const activeRestaurant = signal({
      id: 'restaurant-mesaflow-centro',
      organizationId: 'org-demo',
      name: 'MesaFlow Centro',
      displayName: 'MesaFlow Centro',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      isActive: true,
    });
    const apiMock = {
      ...createApiMock(),
      confirmRestaurantReservation: vi.fn(() => actionResponse.asObservable()),
    };
    const restaurantContext = {
      activeRestaurant: activeRestaurant.asReadonly(),
      load: vi.fn(),
    };

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: apiMock },
        { provide: RestaurantContextStore, useValue: restaurantContext },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    activeRestaurant.set({
      id: 'restaurant-mesaflow-norte',
      organizationId: 'org-demo',
      name: 'MesaFlow Norte',
      displayName: 'MesaFlow Norte',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      isActive: true,
    });
    fixture.detectChanges();
    await waitFor(() => expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2));

    actionResponse.next(createReservationDto());

    expect(apiMock.getRestaurantReservations).toHaveBeenCalledTimes(2);
  });

  it('clicking a destructive action opens a confirmation dialog without calling the API', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]!);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(apiMock.cancelRestaurantReservation).not.toHaveBeenCalled();
  });

  it('confirming the dialog executes the destructive action', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]!);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, continuar' }));

    expect(apiMock.cancelRestaurantReservation).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dismissing the dialog does not call the API', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]!);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(apiMock.cancelRestaurantReservation).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('seat action executes directly without a confirmation dialog', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sentar' }));

    expect(apiMock.seatRestaurantReservation).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('passes the selected date to the API when loading reservations', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    expect(apiMock.getRestaurantReservations).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('shows an error when creating one reservation fails', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    apiMock.createRestaurantReservation = vi.fn(() => throwError(() => new Error('boom')));

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.click(screen.getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }));

    expect(await screen.findByText('No se ha podido crear la reserva.')).toBeTruthy();
  });

  it('shows a spinner in the creation CTA while a reservation is submitting', async () => {
    const i18n = provideI18nTesting();
    const createSubject = new Subject<RestaurantReservationDto>();
    const apiMock = {
      ...createApiMock(),
      createRestaurantReservation: vi.fn(() => createSubject.asObservable()),
    };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    fireEvent.input(within(drawer).getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }));

    expect(within(drawer).getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }).hasAttribute('disabled')).toBe(true);
    expect(drawer.querySelector('.spinner')).toBeTruthy();
  });

  it('shows a success toast after a reservation action completes', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const toastMock = { success: vi.fn(), danger: vi.fn(), show: vi.fn(), dismiss: vi.fn(), clear: vi.fn() };

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: apiMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(apiMock.confirmRestaurantReservation).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reserva confirmada' }));
  });

  it('the previous day button moves the selected date back one day', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    const component = fixture.componentInstance as unknown as { selectedDate: { (): string } };
    const initialDate = component.selectedDate();

    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));

    const [year, month, day] = initialDate.split('-').map(Number);
    const expected = new Date(year!, month! - 1, day! - 1);
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
    expect(component.selectedDate()).toBe(expectedStr);
  });

  it('clicking the unassigned summary card filters to reservations without a table', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: /sin mesa/i }));

    expect(screen.getByText('Diego Martin')).toBeTruthy();
    expect(screen.queryByText('Laura Gomez')).toBeNull();
  });

  it('the "today" button appears after navigating away and returns to today', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    const component = fixture.componentInstance as unknown as { selectedDate: { (): string } };
    const today = component.selectedDate();

    // Initially on today — button should not be visible
    expect(screen.queryByRole('button', { name: 'Hoy' })).toBeNull();

    // Navigate away
    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
    fixture.detectChanges();

    // Now button should appear
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeTruthy();

    // Click it — go back to today
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(component.selectedDate()).toBe(today);
  });

  it('opens the reservation creation flow inside a drawer instead of a centered dialog', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));

    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    expect(drawer.getAttribute('data-variant')).toBe('drawer');
    expect(drawer.closest('.dialog')?.classList.contains('dialog--drawer')).toBe(true);
    expect(within(drawer).getAllByText('Cliente').length).toBeGreaterThan(0);
    expect(within(drawer).getByText('Hora')).toBeTruthy();
    expect(within(drawer).getByText('Mesa')).toBeTruthy();
    expect(within(drawer).getByText('Todas las mesas')).toBeTruthy();
  });

  it('updates the sticky summary after changing time, party size, and table selection', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));

    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    const summary = drawer.querySelector('.reservations-page__drawer-summary') as HTMLElement;

    expect(within(summary).getByText('Sin mesa asignada')).toBeTruthy();

    fireEvent.click(within(drawer).getByRole('radio', { name: '14:00' }));
    fireEvent.input(within(drawer).getByLabelText('Comensales'), { target: { value: '4' } });
    fireEvent.click(within(drawer).getByRole('checkbox', { name: /Mesa 2/ }));

    expect(within(summary).getByText(/14:00/)).toBeTruthy();
    expect(within(summary).getByText(/4 comensales/)).toBeTruthy();
    expect(within(summary).getByText('Mesa 2')).toBeTruthy();
    expect(within(summary).getByText('Capacidad total de las mesas seleccionadas: 4 plazas.')).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: 'Selecciona un cliente' })).toBeTruthy();
  });

  it('synchronizes the selected time when changing to another service window', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });

    fireEvent.click(within(drawer).getByRole('radio', { name: 'Cenas' }));

    expect(within(drawer).getByRole('radio', { name: '20:00' }).className).toContain(
      'reservations-page__time-slot--selected',
    );
    expect(within(drawer).queryByText(/13:30/)).toBeNull();
    const summary = drawer.querySelector('.reservations-page__drawer-summary') as HTMLElement;
    expect(within(summary).getByText(/20:00/)).toBeTruthy();
  });

  it('exposes the selected reservation time with radio semantics', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    const recommendedSlots = within(drawer).getByRole('radiogroup', { name: 'Horas recomendadas' });

    expect(within(recommendedSlots).getByRole('radio', { name: '13:30' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(within(recommendedSlots).getByRole('radio', { name: '14:00' }));

    expect(within(recommendedSlots).getByRole('radio', { name: '13:30' }).getAttribute('aria-checked')).toBe('false');
    expect(within(recommendedSlots).getByRole('radio', { name: '14:00' }).getAttribute('aria-checked')).toBe('true');
  });

  it('replaces the default time when the initial service window excludes it', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    apiMock.getRestaurantServiceWindows = vi.fn(() => of([
      { id: 'sw-custom', restaurantId: 'restaurant-mesaflow-centro', name: 'Tarde', startTime: '18:00', endTime: '19:00', sortOrder: 1 },
    ]));

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fixture.detectChanges();

    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    const component = fixture.componentInstance as unknown as {
      creationForm(): { time: string };
    };

    expect(component.creationForm().time).toBe('18:00');
    expect(within(drawer).getByRole('radio', { name: '18:00' }).className).toContain(
      'reservations-page__time-slot--selected',
    );
  });

  it('corrects an invalid selected time after saving an edit to the active service window', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    apiMock.updateRestaurantServiceWindows = vi.fn(() => of([
      { ...demoServiceWindows[0]!, startTime: '14:00', endTime: '16:30' },
      demoServiceWindows[1]!,
    ]));

    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    const drawer = screen.getByRole('dialog', { name: 'Crear reserva' });
    const component = fixture.componentInstance as unknown as {
      openServiceWindowsEdit(): void;
      updateServiceWindowRow(index: number, field: 'startTime', value: string): void;
      saveServiceWindows(): void;
      creationForm(): { time: string };
    };
    component.openServiceWindowsEdit();
    component.updateServiceWindowRow(0, 'startTime', '14:00');
    component.saveServiceWindows();
    fixture.detectChanges();

    expect(component.creationForm().time).toBe('14:00');
    expect(within(drawer).getByRole('radio', { name: '14:00' }).className).toContain(
      'reservations-page__time-slot--selected',
    );
  });

  it('requires a time from the active service slots before creating a reservation', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();
    const { fixture } = await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });
    const component = fixture.componentInstance as unknown as {
      openCreateReservation(): void;
      updateCreateField(field: 'customerNameSnapshot' | 'time', value: string): void;
      creationProgressState(): { hasTime: boolean; ctaLabelKey: string };
      submitReservation(): void;
    };

    component.openCreateReservation();
    component.updateCreateField('customerNameSnapshot', 'Marina Soler');
    component.updateCreateField('time', '17:00');
    expect(component.creationProgressState()).toMatchObject({
      hasTime: false,
      ctaLabelKey: 'restaurantPos.reservations.create.cta.selectTime',
    });

    component.submitReservation();

    expect(apiMock.createRestaurantReservation).not.toHaveBeenCalled();
  });

  it('shows time slot chips based on the service windows from the API', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));

    // Comidas 12:00–16:30 → should have these chip buttons
    expect(screen.getByRole('radio', { name: '12:00' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '13:30' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '16:30' })).toBeTruthy();
  });
});
