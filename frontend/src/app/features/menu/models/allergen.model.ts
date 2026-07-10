import type { Allergen } from './product.model';

export const ALLERGEN_VALUES: readonly Allergen[] = [
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
] as const;

export type LocalizedAllergenOption = {
  value: Allergen;
  label: string;
};

export function hasDeclaredAllergens(allergens?: readonly string[] | null): boolean {
  return Array.isArray(allergens) && allergens.length > 0;
}
