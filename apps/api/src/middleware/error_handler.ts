import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, BookingNotFoundError, InvalidBookingTransitionError } from '@frostdesk/db';

/**
 * Unified error envelope format.
 * All error responses use flat shape: error is ErrorCode string, no nested { code }.
 */
export interface ErrorEnvelope {
  ok: false;
  error: string;         // ErrorCode string (e.g. 'UNAUTHENTICATED', 'ADMIN_ONLY')
  message?: string;
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
  // 402 Payment Required (pilot gating)
  'PILOT_ONLY': 402,
  // 403 Forbidden
  'ADMIN_ONLY': 403,
  'ONBOARDING_REQUIRED': 403,
  'FORBIDDEN': 403,

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
      payload: { ok: false, error: 'ADMIN_ONLY' },
    };
  }

  if (error instanceof BookingNotFoundError) {
    return {
      statusCode: 404,
      payload: { ok: false, error: 'BOOKING_NOT_FOUND' },
    };
  }

  if (error instanceof InvalidBookingTransitionError) {
    return {
      statusCode: 409,
      payload: { ok: false, error: 'INVALID_BOOKING_TRANSITION' },
    };
  }

  // Handle errors with code property
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    const statusCode = ERROR_CODE_TO_STATUS[code] || 500;
    const message = 'message' in error && typeof (error as any).message === 'string' ? (error as any).message : undefined;
    return {
      statusCode,
      payload: message !== undefined ? { ok: false, error: code, message } : { ok: false, error: code },
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    const statusCode = ERROR_CODE_TO_STATUS[error] || 500;
    return {
      statusCode,
      payload: { ok: false, error },
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    const code = (error as any).code || error.name || 'INTERNAL_ERROR';
    const statusCode = ERROR_CODE_TO_STATUS[code] || 500;
    const message = error.message?.trim() ? error.message : undefined;
    return {
      statusCode,
      payload: message !== undefined ? { ok: false, error: code, message } : { ok: false, error: code },
    };
  }

  // Fallback for unknown errors
  return {
    statusCode: 500,
    payload: { ok: false, error: 'INTERNAL_ERROR' },
  };
}

/**
 * Normalizes error response payload to flat format: { ok: false, error: string, message?: string }.
 */
function normalizeErrorResponse(payload: any): ErrorEnvelope | null {
  if (!payload || typeof payload !== 'object' || payload.ok !== false) return null;

  // Already flat: { ok: false, error: string, message?: string }
  if (typeof payload.error === 'string') {
    return {
      ok: false,
      error: payload.error,
      ...(payload.message != null && typeof payload.message === 'string' ? { message: payload.message } : {}),
    };
  }

  // Legacy: { ok: false, error: { code, message? } }
  if (payload.error && typeof payload.error === 'object' && 'code' in payload.error) {
    const code = String(payload.error.code);
    const message = typeof payload.error.message === 'string' ? payload.error.message : undefined;
    return { ok: false, error: code, ...(message !== undefined ? { message } : {}) };
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
          const statusCode = ERROR_CODE_TO_STATUS[normalized.error] ?? reply.statusCode;
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
