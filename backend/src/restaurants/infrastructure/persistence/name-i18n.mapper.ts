import type { NameI18n } from '../../domain/restaurant-read.models';

// `nameI18n` es una columna Json/JsonB opcional: puede venir null, un objeto
// vacio, o con solo alguno de los tres idiomas. Solo se aceptan strings no
// vacios por idioma; cualquier otra cosa (valor corrupto, tipo inesperado) se
// descarta en vez de propagarse al cliente. Usar al leer de Prisma.
export function asNameI18n(value: unknown): NameI18n | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const result: NameI18n = {};

  for (const locale of ['es', 'ca', 'en'] as const) {
    const candidate = source[locale];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      result[locale] = candidate;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// Normaliza (recorta espacios, descarta vacios) antes de persistir. Devuelve
// `undefined` cuando no queda ninguna variante, para no escribir `{}` en la
// columna Json y mantener el dato limpio.
export function toNameI18nJson(value: NameI18n | null | undefined): NameI18n | undefined {
  if (!value) {
    return undefined;
  }

  const result: NameI18n = {};
  for (const locale of ['es', 'ca', 'en'] as const) {
    const candidate = value[locale];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      result[locale] = candidate.trim();
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
