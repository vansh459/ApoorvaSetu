import { Prisma } from '@prisma/client';

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asOptionalArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

export function asObject<T>(value: unknown): T | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined;
}

export function optional<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

export function jsonRequired(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function jsonOptional(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === undefined || value === null
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue);
}
