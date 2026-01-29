import { ERROR_CODES, type ErrorCode } from './error_codes.js';

/**
 * Normalizes any error to standard API error format.
 * 
 * WHAT IT DOES:
 * - Converts any error to unified API error shape
 * - Uses only ERROR_CODES registry
 * - Extracts message if available
 * 
 * WHAT IT DOES NOT DO:
 * - No logging
 * - No state mutations
 * - No business logic
 * - No status code decisions
 * 
 * @param err - Any error (Error object, object with code, string, unknown)
 * @returns Standardized error response shape
 */
export function normalizeError(err: unknown): {
  ok: false;
  error: ErrorCode;
  message?: string;
} {
  // Rule 1: If err has code property and code is in ERROR_CODES → use that
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String(err.code);
    
    // Check if code exists in ERROR_CODES registry
    const errorCodeValues = Object.values(ERROR_CODES) as readonly string[];
    if (errorCodeValues.includes(code)) {
      const result: {
        ok: false;
        error: ErrorCode;
        message?: string;
      } = {
        ok: false,
        error: code as ErrorCode,
      };
      
      // Extract message if available
      if ('message' in err && typeof err.message === 'string' && err.message.trim().length > 0) {
        result.message = err.message;
      }
      
      return result;
    }
  }

  // Rule 2: If err is standard Error → INTERNAL_ERROR
  if (err instanceof Error) {
    const result: {
      ok: false;
      error: ErrorCode;
      message?: string;
    } = {
      ok: false,
      error: ERROR_CODES.INTERNAL_ERROR,
    };
    
    // Extract message if available
    if (err.message && typeof err.message === 'string' && err.message.trim().length > 0) {
      result.message = err.message;
    }
    
    return result;
  }

  // Rule 3: If err is unknown object → INTERNAL_ERROR
  // This covers: objects without code, strings, numbers, null, undefined, etc.
  const result: {
    ok: false;
    error: ErrorCode;
    message?: string;
  } = {
    ok: false,
    error: ERROR_CODES.INTERNAL_ERROR,
  };
  
  // Try to extract message from object if it exists
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.trim().length > 0) {
    result.message = err.message;
  }
  
  return result;
}
