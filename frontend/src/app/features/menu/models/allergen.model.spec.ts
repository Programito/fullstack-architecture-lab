import { describe, expect, it } from 'vitest';
import { ALLERGEN_VALUES, hasDeclaredAllergens } from './allergen.model';

describe('allergen.model', () => {
  it('exports the 14 backend allergen keys in stable order', () => {
    expect(ALLERGEN_VALUES).toEqual([
      'gluten',
      'crustaceans',
      'eggs',
      'fish',
      'peanuts',
      'soybeans',
      'milk',
      'nuts',
      'celery',
      'mustard',
      'sesame',
      'sulphites',
      'lupin',
      'molluscs',
    ]);
  });

  it('detects when a product declares allergens', () => {
    expect(hasDeclaredAllergens(['gluten'])).toBe(true);
    expect(hasDeclaredAllergens([])).toBe(false);
    expect(hasDeclaredAllergens(null)).toBe(false);
    expect(hasDeclaredAllergens(undefined)).toBe(false);
  });
});
