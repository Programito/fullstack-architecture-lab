import { fireEvent, render, screen, within } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { ToastService } from '../../../../shared/ui/toast/toast';
import type { RestaurantFloorsDto, RestaurantReservationDto } from '../../api/restaurant-pos-api.models';
import type { ServiceWindowDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantPosReservationsPage } from './restaurant-pos-reservations-page';

describe('RestaurantPosReservationsPage', () => {
  function todayAt(hours: number, minutes: number): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0).toISOString();
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
      ],
      floors: [],
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
    expect(component.manualTables()).toEqual([]);
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

    expect(within(lunchCard as HTMLElement).getByText('1 reservas')).toBeTruthy();
    expect(within(dinnerCard as HTMLElement).getByText('1 reservas')).toBeTruthy();
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

    expect(screen.getByText('Ideal fit')).toBeTruthy();
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
    fireEvent.input(screen.getByLabelText('Telefono'), { target: { value: '+34 600 777 888' } });
    fireEvent.input(screen.getByLabelText('Comensales'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: '13:30' }));
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

  it('keeps the create flow available without selecting a table', async () => {
    const i18n = provideI18nTesting();
    const apiMock = createApiMock();

    await render(RestaurantPosReservationsPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
    fireEvent.click(screen.getByRole('button', { name: '13:30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' }));

    expect(apiMock.createRestaurantReservation).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      expect.objectContaining({ tableIds: [] }),
    );
  });

  it('provides translation entries for the drawer guidance labels', () => {
    const i18n = provideI18nTesting();

    expect(i18n.translations.es.restaurantPos.reservations.create.cta.selectTime).toBeTruthy();
    expect(i18n.translations.es.restaurantPos.reservations.create.suggestedTables).toBeTruthy();
    expect(i18n.translations.es.restaurantPos.reservations.occupancyHeading).toBe('Vision operativa del dia');
    expect(i18n.translations.en.restaurantPos.reservations.create.tableTitle).toBe('Table');
    expect(i18n.translations.en.restaurantPos.reservations.create.manualTables).toBe('All tables');
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
    expect(within(drawer).queryByText('Todas las mesas')).toBeNull();
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

    fireEvent.click(within(drawer).getByRole('button', { name: '14:00' }));
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

    expect(within(drawer).getByRole('button', { name: '20:00' }).className).toContain(
      'reservations-page__time-slot--selected',
    );
    expect(within(drawer).queryByText(/13:30/)).toBeNull();
    const summary = drawer.querySelector('.reservations-page__drawer-summary') as HTMLElement;
    expect(within(summary).getByText(/20:00/)).toBeTruthy();
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
    expect(screen.getByRole('button', { name: '12:00' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '13:30' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '16:30' })).toBeTruthy();
  });
});
