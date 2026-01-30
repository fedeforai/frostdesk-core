import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, BookingNotFoundError, InvalidBookingTransitionError } from '@frostdesk/db';

/**
 * Unified error envelope format.
 * All error responses must follow this shape.
 */
export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;        // MACHINE-READABLE
    message?: string;    // OPTIONAL (safe)
    details?: unknown;   // OPTIONAL (debug only)
  };
}

/**
 * Maps error codes to HTTP status codes deterministically.
 * 
 * WHAT IT DOES:
 * - Provides deterministic mapping from error code → HTTP status
 * - Covers all known error types in the system
 * 
 * WHAT IT DOES NOT DO:
 * - No logging
 * - No side effects
 * - No retries
 */
const ERROR_CODE_TO_STATUS: Record<string, number> = {
  // 400 Bad Request
  'MISSING_PARAMETERS': 400,
  'INVALID_ENV': 400,
  'missing_text': 400,
  'invalid_payload': 400,
  'INVALID_TIME_RANGE': 400,

  // 401 Unauthorized
  'UNAUTHENTICATED': 401,
  // 403 Forbidden
  'ADMIN_ONLY': 403,
  'ONBOARDING_REQUIRED': 403,
  
  // 404 Not Found
  'NOT_FOUND': 404,
  'BOOKING_NOT_FOUND': 404,
  'CONVERSATION_NOT_FOUND': 404,
  
  // 409 Conflict
  'INVALID_BOOKING_TRANSITION': 409,
  'PROFILE_ALREADY_EXISTS': 409,
  
  // 429 Too Many Requests
  'RATE_LIMIT_EXCEEDED': 429,
  
  // 503 Service Unavailable
  'service_disabled': 503,
  
  // 500 Internal Server Error (default)
  'database_error': 500,
  'INTERNAL_ERROR': 500,
  'internal_error': 500,
};

/**
 * Normalizes any error to the unified error envelope format.
 * 
 * WHAT IT DOES:
 * - Extracts error code from known error types
 * - Maps error code to HTTP status
 * - Returns unified error envelope
 * 
 * WHAT IT DOES NOT DO:
 * - No logging
 * - No mutations
 * - No side effects
 */
function normalizeError(error: unknown): { statusCode: number; payload: ErrorEnvelope } {
  // Handle known error types with code property
  if (error instanceof UnauthorizedError) {
    return {
      statusCode: 403,
      payload: {
        ok: false,
        error: {
          code: 'ADMIN_ONLY',
        },
      },
    };
  }

  if (error instanceof BookingNotFoundError) {
    return {
      statusCode: 404,
      payload: {
        ok: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
        },
      },
    };
  }

  if (error instanceof InvalidBookingTransitionError) {
    return {
      statusCode: 409,
      payload: {
        ok: false,
        error: {
          code: 'INVALID_BOOKING_TRANSITION',
        },
      },
    };
  }

  // Handle errors with code property
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    const statusCode = ERROR_CODE_TO_STATUS[code] || 500;
    return {
      statusCode,
      payload: {
        ok: false,
        error: {
          code,
        },
      },
    };
  }

  // Handle string errors (legacy format)
  if (typeof error === 'string') {
    const statusCode = ERROR_CODE_TO_STATUS[error] || 500;
    return {
      statusCode,
      payload: {
        ok: false,
        error: {
          code: error,
        },
      },
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Try to extract code from error name or message
    const code = (error as any).code || error.name || 'INTERNAL_ERROR';
    const statusCode = ERROR_CODE_TO_STATUS[code] || 500;
    return {
      statusCode,
      payload: {
        ok: false,
        error: {
          code,
        },
      },
    };
  }

  // Fallback for unknown errors
  return {
    statusCode: 500,
    payload: {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
      },
    },
  };
}

/**
 * Normalizes error response payload to unified format.
 * Handles both string errors and object errors.
 */
function normalizeErrorResponse(payload: any): ErrorEnvelope | null {
  // Already in correct format
  if (payload && typeof payload === 'object' && payload.ok === false && payload.error && typeof payload.error === 'object' && 'code' in payload.error) {
    return payload as ErrorEnvelope;
  }

  // Legacy format: { ok: false, error: 'string' }
  if (payload && typeof payload === 'object' && payload.ok === false && typeof payload.error === 'string') {
    return {
      ok: false,
      error: {
        code: payload.error,
      },
    };
  }

  return null;
}

/**
 * Registers global error handler and response interceptor for Fastify.
 * 
 * WHAT IT DOES:
 * - Catches all unhandled errors and normalizes to unified format
 * - Intercepts all responses to normalize error payloads
 * - Returns consistent error format across all routes
 * 
 * WHAT IT DOES NOT DO:
 * - No logging (Fastify logger handles that)
 * - No retries
 * - No mutations
 */
export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  // Error handler: catches thrown errors
  app.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const { statusCode, payload } = normalizeError(error);
    return reply.status(statusCode).send(payload);
  });

  // Response interceptor: normalizes manually returned error responses
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Only process error responses (status >= 400)
    if (reply.statusCode >= 400 && payload) {
      try {
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const normalized = normalizeErrorResponse(parsed);
        
        if (normalized) {
          // Update status code based on error code if needed
          const statusCode = ERROR_CODE_TO_STATUS[normalized.error.code] || reply.statusCode;
          reply.statusCode = statusCode;
          return JSON.stringify(normalized);
        }
      } catch {
        // If parsing fails, return as-is
      }
    }
    
    return payload;
  });
}
