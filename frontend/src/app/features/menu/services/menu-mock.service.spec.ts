import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
import { PRODUCT_COURSES, PRODUCT_TYPES, PREPARATION_ROUTES, type ProductCourse } from '../models/menu.models';
import { MenuMockService, localizeMenuProducts } from './menu-mock.service';

describe('MenuMockService', () => {
  const setup = (locale = 'es') => {
    const i18n = provideI18nTesting(locale as 'es' | 'en' | 'ca');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });

    return TestBed.inject(MenuMockService);
  };

  it('localizes products, categories, modifier groups and options in Spanish', () => {
    const menu = setup('es');

    expect(menu.products().find((product) => product.id === 'product-1')).toEqual(
      expect.objectContaining({
        id: 'product-1',
        name: 'Hamburguesa craft',
        category: 'Clásicas',
        basePrice: 12.5,
      }),
    );
    expect(menu.categories().find((category) => category.id === 'burgers')?.name).toBe('Hamburguesas');
    expect(menu.modifierGroups().find((group) => group.id === 'burger-point')?.name).toBe('Punto de la carne');
    expect(menu.modifierGroups().flatMap((group) => group.options).find((option) => option.id === 'remove-onion')?.name).toBe('Cebolla');
  });

  it('changes localized text without changing stable ids or prices', () => {
    const spanishProduct = localizeMenuProducts('es').find((product) => product.id === 'product-2')!;
    const englishProduct = localizeMenuProducts('en').find((product) => product.id === 'product-2')!;
    const catalanProduct = localizeMenuProducts('ca').find((product) => product.id === 'product-2')!;

    expect(spanishProduct.name).toBe('Croquetas de jamón ibérico');
    expect(englishProduct.name).toBe('Iberian Ham Croquettes');
    expect(catalanProduct.name).toBe('Croquetes de pernil ibèric');
    expect(new Set([spanishProduct.id, englishProduct.id, catalanProduct.id])).toEqual(new Set(['product-2']));
    expect(new Set([spanishProduct.basePrice, englishProduct.basePrice, catalanProduct.basePrice])).toEqual(new Set([8.75]));
  });

  it('reacts to active language changes', () => {
    const menu = setup('es');

    expect(menu.products().find((product) => product.id === 'product-3')?.name).toBe('Limonada con gas');

    TestBed.inject(TranslocoService).setActiveLang('en');

    expect(menu.products().find((product) => product.id === 'product-3')?.name).toBe('Sparkling Lemonade');
  });

  it('supports platter products with included components and modifier groups', () => {
    const menu = setup('es');
    const platter = menu.products().find((product) => product.id === 'product-17');

    expect(menu.categories().find((category) => category.id === 'platters')?.name).toBe('Platos combinados');
    expect(platter).toEqual(
      expect.objectContaining({
        name: 'Plato combinado de lomo',
        type: 'platter',
        basePrice: 12.9,
        modifierGroupIds: ['platter-remove', 'platter-extras'],
        platterComponents: [
          expect.objectContaining({ name: 'Lomo', removable: false, replaceable: false }),
          expect.objectContaining({ name: 'Huevo', removable: true, replaceable: false }),
          expect.objectContaining({ name: 'Patatas fritas', removable: true, replaceable: false }),
          expect.objectContaining({ name: 'Ensalada', removable: true, replaceable: false }),
        ],
      }),
    );
    expect(menu.products().find((product) => product.id === 'product-19')).toEqual(
      expect.objectContaining({ name: 'Plato combinado vegetal', type: 'platter', modifierGroupIds: [] }),
    );
  });

  it('defines catalog-owned product variants, courses and preparation policies', () => {
    const menu = setup('en');
    const burger = menu.products().find((product) => product.id === 'product-1')!;
    const drink = menu.products().find((product) => product.id === 'product-3')!;
    const course: ProductCourse = burger.course;

    expect(Object.values(PRODUCT_TYPES)).toEqual(['simple', 'combo', 'platter']);
    expect(Object.values(PRODUCT_COURSES)).toEqual(['drinks', 'starter', 'main', 'dessert', 'other']);
    expect(Object.values(PREPARATION_ROUTES)).toContain('kitchen');
    expect(course).toBe('main');
    expect(burger.preparationPolicy).toEqual({ route: 'kitchen', requiresReadyBeforeServe: true });
    expect(drink.preparationPolicy).toEqual({ route: 'bar', requiresReadyBeforeServe: false });
  });
});
