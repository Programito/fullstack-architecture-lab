import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
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
});
