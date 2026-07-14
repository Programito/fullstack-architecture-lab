import { Prisma, type LogCategory } from '@prisma/client';

const BLOCKED_METADATA_KEYS = new Set(['authorization', 'cookie', 'password', 'token', 'refreshToken', 'accessToken']);

export function sanitizeMetadata(
  _category: LogCategory,
  metadata?: Prisma.InputJsonValue | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return metadata ?? Prisma.JsonNull;
  }

  const entries = Object.entries(metadata)
    .filter(([key]) => !BLOCKED_METADATA_KEYS.has(key))
    .slice(0, 12)
    .map(([key, value]) => [key.slice(0, 80), sanitizeValue(value)]);

  return entries.length > 0 ? Object.fromEntries(entries) : Prisma.JsonNull;
}

function sanitizeValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 200);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((entry) => sanitizeValue(entry)) as Prisma.InputJsonValue[];
  }

  if (typeof value === 'object') {
    const nestedEntries = Object.entries(value)
      .filter(([key]) => !BLOCKED_METADATA_KEYS.has(key))
      .slice(0, 8)
      .map(([key, entry]) => [key.slice(0, 80), sanitizeValue(entry)]);

    return Object.fromEntries(nestedEntries) as Prisma.InputJsonObject;
  }

  return String(value).slice(0, 200);
}
