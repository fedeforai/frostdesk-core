/**
 * Reschedule Field Extractor (PILOT-SAFE)
 *
 * Parses a free-text customer message requesting a reschedule and extracts:
 *   - current booking times (what the customer wants to change FROM)
 *   - new requested times (what they want to change TO)
 *   - date reference (tomorrow, specific date)
 *   - same meeting point flag
 *
 * Pure regex/pattern matching — no LLM calls.
 * No side effects. No DB access.
 */

export interface ExtractedRescheduleFields {
  /** ISO date string (YYYY-MM-DD) for the booking to reschedule. */
  date: string | null;
  /** Current booking start (HH:MM). */
  currentStart: string | null;
  /** Current booking end (HH:MM). */
  currentEnd: string | null;
  /** Requested new start (HH:MM). */
  newStart: string | null;
  /** Requested new end (HH:MM). */
  newEnd: string | null;
  /** Customer explicitly said "same meeting point / stesso punto di ritrovo". */
  sameLocation: boolean;
}

export interface RescheduleExtractionResult {
  fields: ExtractedRescheduleFields;
  /** True when we extracted at least the new start time. */
  usable: boolean;
}

// ── Date extraction (reuses same patterns as bookingFieldExtractor) ─────────

function extractDate(text: string): string | null {
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const euMatch = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const lower = text.toLowerCase();
  if (/\btomorrow\b|\bdomani\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\bdopodomani\b|\bday after tomorrow\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }

  return null;
}

// ── Time helpers ────────────────────────────────────────────────────────────

function normalizeTime(raw: string): string {
  const cleaned = raw.replace('.', ':');
  if (!cleaned.includes(':')) return `${cleaned.padStart(2, '0')}:00`;
  const [h, m] = cleaned.split(':');
  return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
}

/**
 * Detects the "from X to Y" reschedule pattern.
 *
 * Supports:
 *   - "from 09:00-11:00 to 11:00-13:00"
 *   - "da 09:00-11:00 a 11:00-13:00"
 *   - "dalle 09 alle 11 alle 11 alle 13" (less common)
 *   - "move my lesson from 09:00-11:00 to 11:00-13:00"
 *   - "spostare la lezione dalle 09:00-11:00 alle 11:00-13:00"
 */
function extractRescheduleTimes(text: string): {
  currentStart: string | null;
  currentEnd: string | null;
  newStart: string | null;
  newEnd: string | null;
} {
  // Pattern: "from HH:MM-HH:MM to HH:MM-HH:MM"
  // Also: "da HH:MM-HH:MM a HH:MM-HH:MM"
  const fullRangePattern =
    /(?:from|da|dalle?)\s+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\s+(?:to|a|alle?)\s+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i;
  const fullMatch = text.match(fullRangePattern);
  if (fullMatch) {
    return {
      currentStart: normalizeTime(fullMatch[1]),
      currentEnd: normalizeTime(fullMatch[2]),
      newStart: normalizeTime(fullMatch[3]),
      newEnd: normalizeTime(fullMatch[4]),
    };
  }

  // Pattern: two time ranges separated by "to"/"a"/"alle"
  // e.g. "09:00-11:00 to 11:00-13:00"
  const twoRanges =
    /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\s+(?:to|a|alle?|→)\s+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i;
  const twoMatch = text.match(twoRanges);
  if (twoMatch) {
    return {
      currentStart: normalizeTime(twoMatch[1]),
      currentEnd: normalizeTime(twoMatch[2]),
      newStart: normalizeTime(twoMatch[3]),
      newEnd: normalizeTime(twoMatch[4]),
    };
  }

  // Pattern: "to HH:MM-HH:MM" (only new range, no current)
  // e.g. "spostare a 11:00-13:00" / "move to 11:00-13:00"
  const newRangeOnly =
    /(?:to|a|alle?|→)\s+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i;
  const newMatch = text.match(newRangeOnly);
  if (newMatch) {
    return {
      currentStart: null,
      currentEnd: null,
      newStart: normalizeTime(newMatch[1]),
      newEnd: normalizeTime(newMatch[2]),
    };
  }

  // Pattern: "at HH:MM" / "alle HH:MM" (only new start, infer end from duration)
  const singleNew =
    /(?:(?:sposta|move|change|cambia|posticipa|anticipa).*?(?:to|a|alle?)\s+)(\d{1,2}[:.]\d{2})/i;
  const singleMatch = text.match(singleNew);
  if (singleMatch) {
    return {
      currentStart: null,
      currentEnd: null,
      newStart: normalizeTime(singleMatch[1]),
      newEnd: null,
    };
  }

  return { currentStart: null, currentEnd: null, newStart: null, newEnd: null };
}

// ── Same location detection ─────────────────────────────────────────────────

function detectSameLocation(text: string): boolean {
  return /same\s+(meeting\s*)?point|stesso\s+(punto\s+(di\s+)?ritrovo|luogo)|stessa\s+location|same\s+location|same\s+place|stesso\s+posto/i.test(text);
}

// ── Main extractor ──────────────────────────────────────────────────────────

export function extractRescheduleFields(messageText: string): RescheduleExtractionResult {
  const date = extractDate(messageText);
  const times = extractRescheduleTimes(messageText);
  const sameLocation = detectSameLocation(messageText);

  const fields: ExtractedRescheduleFields = {
    date,
    currentStart: times.currentStart,
    currentEnd: times.currentEnd,
    newStart: times.newStart,
    newEnd: times.newEnd,
    sameLocation,
  };

  return {
    fields,
    usable: fields.newStart !== null,
  };
}
