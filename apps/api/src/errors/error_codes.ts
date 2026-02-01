/**
 * Centralized error code registry for API layer.
 * 
 * WHAT IT DOES:
 * - Provides single source of truth for all error codes
 * - Enables type-safe error code usage
 * - Ensures consistency across API
 * 
 * WHAT IT DOES NOT DO:
 * - No runtime logic
 * - No error throwing
 * - No logging
 * - No side effects
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ADMIN_ONLY: 'ADMIN_ONLY',
  ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation
  INVALID_ENV: 'INVALID_ENV',
  MISSING_PARAMETERS: 'MISSING_PARAMETERS',
  MISSING_TEXT: 'missing_text',
  INVALID_PAYLOAD: 'invalid_payload',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',

  // Not Found
  NOT_FOUND: 'NOT_FOUND',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  
  // Conflict
  INVALID_BOOKING_TRANSITION: 'INVALID_BOOKING_TRANSITION',
  PROFILE_ALREADY_EXISTS: 'PROFILE_ALREADY_EXISTS',
  
  // Service Unavailable
  SERVICE_DISABLED: 'service_disabled',
  WHATSAPP_SEND_FAILED: 'WHATSAPP_SEND_FAILED',

  // Internal Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVARIANT_FAILED: 'INVARIANT_FAILED',
  DATABASE_ERROR: 'database_error',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
