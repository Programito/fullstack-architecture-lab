import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { CustomerRepository } from '../application/ports/customer-repository.port';
import type { CreateCustomerInput, Customer, CustomerSummary } from '../domain/restaurant-read.models';

const DEMO_ORG_ID = 'org-mesaflow-demo';
const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'customer-001',
    organizationId: DEMO_ORG_ID,
    name: 'Ana García',
    phone: '612345678',
    email: 'ana.garcia@email.com',
    notes: 'Alergia a los frutos secos',
    visitCount: 8,
    noShowCount: 0,
    cancelCount: 1,
    lateCount: 0,
  },
  {
    id: 'customer-002',
    organizationId: DEMO_ORG_ID,
    name: 'Carlos López',
    phone: '698765432',
    email: null,
    notes: null,
    visitCount: 3,
    noShowCount: 2,
    cancelCount: 0,
    lateCount: 1,
  },
  {
    id: 'customer-003',
    organizationId: DEMO_ORG_ID,
    name: 'María Martínez',
    phone: null,
    email: 'maria.martinez@gmail.com',
    notes: 'Cliente VIP — mesa preferida junto a la ventana',
    visitCount: 15,
    noShowCount: 0,
    cancelCount: 0,
    lateCount: 2,
  },
  {
    id: 'customer-004',
    organizationId: DEMO_ORG_ID,
    name: 'David Fernández',
    phone: '677123456',
    email: null,
    notes: null,
    visitCount: 1,
    noShowCount: 1,
    cancelCount: 0,
    lateCount: 0,
  },
];

@Injectable()
export class DemoCustomerRepository implements CustomerRepository {
  private readonly customers: Customer[] = [...INITIAL_CUSTOMERS];

  private toSummary(c: Customer): CustomerSummary {
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      visitCount: c.visitCount,
      noShowCount: c.noShowCount,
      cancelCount: c.cancelCount,
      lateCount: c.lateCount,
    };
  }

  async searchByRestaurantId(restaurantId: string, q: string): Promise<CustomerSummary[] | null> {
    if (restaurantId !== DEMO_RESTAURANT_ID) return null;

    const term = q.trim().toLowerCase();
    const results = term.length === 0
      ? this.customers
      : this.customers.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.phone?.includes(term) ||
            c.email?.toLowerCase().includes(term),
        );

    return results.slice(0, 20).map((c) => this.toSummary(c));
  }

  async createForRestaurant(
    restaurantId: string,
    data: CreateCustomerInput,
  ): Promise<Customer | 'restaurant_not_found' | 'already_exists'> {
    if (restaurantId !== DEMO_RESTAURANT_ID) return 'restaurant_not_found';

    const duplicate = this.customers.find(
      (c) =>
        c.name.toLowerCase() === data.name.trim().toLowerCase() &&
        (c.phone ?? null) === (data.phone ?? null),
    );
    if (duplicate) return 'already_exists';

    const customer: Customer = {
      id: randomUUID(),
      organizationId: DEMO_ORG_ID,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
      visitCount: 0,
      noShowCount: 0,
      cancelCount: 0,
      lateCount: 0,
    };
    this.customers.push(customer);
    return customer;
  }
}
