import { randomUUID } from 'crypto';

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function ensureValidUUID(value?: string): string {
  if (value && isValidUUID(value)) return value;
  return randomUUID();
}
