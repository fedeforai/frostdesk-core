/**
 * UUID validation and generation utilities
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  return typeof value === 'string' && UUID_V4_REGEX.test(value);
}

/**
 * Generates a new UUID v4 using crypto.randomUUID()
 * Falls back to manual generation if crypto.randomUUID is not available
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates and normalizes a conversation ID
 * Returns a valid UUID v4, generating a new one if invalid
 */
export function ensureValidUUID(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') {
    return generateUUID();
  }
  
  if (isValidUUID(value)) {
    return value;
  }
  
  return generateUUID();
}
