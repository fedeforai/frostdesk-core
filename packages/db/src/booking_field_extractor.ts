/**
 * Booking Field Extractor (PILOT-SAFE)
 *
 * Parses a free-text customer message and extracts structured booking fields.
 * Uses deterministic regex/pattern matching (no LLM calls).
 *
 * Returns a completeness check so the orchestrator knows whether to create
 * a structured booking draft or just a text reply.
 */

export interface ExtractedBookingFields {
  /** ISO date string (YYYY-MM-DD) or null */
  date: string | null;
  /** HH:MM 24h */
  startTime: string | null;
  /** HH:MM 24h */
  endTime: string | null;
  /** Duration in minutes (inferred from start/end or explicit) */
  durationMinutes: number | null;
  /** Number of participants */
  partySize: number | null;
  /** e.g. beginner, intermediate, advanced */
  skillLevel: string | null;
  /** e.g. private, group */
  lessonType: string | null;
  /** Free-text resort or location */
  resort: string | null;
  /** Free-text meeting point preference */
  meetingPointText: string | null;
  /** Customer name extracted from message */
  customerName: string | null;
  /** Sport: ski, snowboard, etc. */
  sport: string | null;
}

export interface BookingExtractionResult {
  fields: ExtractedBookingFields;
  /** All required fields present? */
  complete: boolean;
  /** Which required fields are missing */
  missingFields: string[];
  /** Confidence in extraction (0-1) */
  extractionConfidence: number;
}

// ── Required fields for a "complete" booking request ───────────────────────
const REQUIRED_FIELDS: (keyof ExtractedBookingFields)[] = [
  'date',
  'startTime',
  'partySize',
];

// We need either endTime or durationMinutes (at least one)
function hasTimeRange(f: ExtractedBookingFields): boolean {
  return f.endTime !== null || f.durationMinutes !== null;
}

// ── Extraction helpers ─────────────────────────────────────────────────────

function extractDate(text: string): string | null {
  // ISO-like: 2026-02-21
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // European: 21/02/2026 or 21-02-2026
  const euMatch = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Relative: "tomorrow", "domani"
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

  // "next Monday", etc. — skip for pilot (would need NLP)
  return null;
}

function extractTimes(text: string): { startTime: string | null; endTime: string | null } {
  // Time pattern: must be HH:MM or H:MM (requires colon/period separator to avoid matching years)
  // Or a bare 1-2 digit number only when preceded by a keyword (start, at, ore, etc.)
  const TIME_WITH_SEP = /(\d{1,2}[:.]\d{2})/;
  const TIME_BARE = /(\d{1,2})/;

  // Range with explicit separators (HH:MM - HH:MM)
  const rangeWithSep = [
    // "10:00 - 12:00" or "10:00 to 12:00" or "10:00 and end 12:00"
    /(\d{1,2}[:.]\d{2})\s*(?:[-–—]|to|alle?|and\s+end|fino\s+alle?)\s*(\d{1,2}[:.]\d{2})/i,
    // "start 10:00 and end 12:00" / "dalle 10:00 alle 12:00"
    /(?:start|inizio|dalle?)\s+(\d{1,2}[:.]\d{2})\s+(?:and\s+)?(?:end|fine|alle?)\s+(\d{1,2}[:.]\d{2})/i,
  ];

  for (const pat of rangeWithSep) {
    const m = text.match(pat);
    if (m) {
      return { startTime: normalizeTime(m[1]), endTime: normalizeTime(m[2]) };
    }
  }

  // Range with keyword + bare number: "start 10 and end 12"
  const rangeWithKeyword = /(?:start|inizio|dalle?)\s+(\d{1,2})(?::(\d{2}))?\s+(?:and\s+)?(?:end|fine|alle?)\s+(\d{1,2})(?::(\d{2}))?/i;
  const rkm = text.match(rangeWithKeyword);
  if (rkm) {
    const startH = rkm[1], startM = rkm[2] || '00';
    const endH = rkm[3], endM = rkm[4] || '00';
    return {
      startTime: normalizeTime(`${startH}:${startM}`),
      endTime: normalizeTime(`${endH}:${endM}`),
    };
  }

  // Single time with separator: "at 10:00" / "ore 10:00"
  const singleWithSep = text.match(/(?:at|ore|alle?|from|dalle?|start)\s+(\d{1,2}[:.]\d{2})/i);
  if (singleWithSep) {
    return { startTime: normalizeTime(singleWithSep[1]), endTime: null };
  }

  return { startTime: null, endTime: null };
}

function normalizeTime(raw: string): string {
  // "10" → "10:00", "10.30" → "10:30", "10:30" → "10:30"
  const cleaned = raw.replace('.', ':');
  if (!cleaned.includes(':')) return `${cleaned.padStart(2, '0')}:00`;
  const [h, m] = cleaned.split(':');
  return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
}

function extractDuration(text: string): number | null {
  // "2 hours", "2h", "2 ore", "(2 hours)"
  const m = text.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ore|h)\b/i);
  if (m) return Math.round(parseFloat(m[1]) * 60);

  // "90 minutes", "90 min", "90 minuti"
  const minMatch = text.match(/\b(\d+)\s*(?:minutes?|mins?|minuti?)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10);

  return null;
}

function extractPartySize(text: string): number | null {
  // "2 adults", "3 persone", "for 4 people", "per 2 adulti"
  const patterns = [
    /\b(\d+)\s*(?:adults?|adulti?|people|person[es]?|pax|partecipanti?)/i,
    /\bfor\s+(\d+)\b/i,
    /\bper\s+(\d+)\b/i,
    /\b(\d+)\s+(?:of us|di noi)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function extractSkillLevel(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bbeginner|principiant/i.test(lower)) return 'beginner';
  if (/\bintermediat|intermedi/i.test(lower)) return 'intermediate';
  if (/\badvanced|avanzat|expert|espert/i.test(lower)) return 'advanced';
  return null;
}

function extractLessonType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bprivat/i.test(lower)) return 'private';
  if (/\bgroup|grupp|collettiv/i.test(lower)) return 'group';
  return null;
}

function extractResort(text: string): string | null {
  // Common ski resorts
  const resorts = [
    'courchevel', 'meribel', 'val thorens', 'la tania',
    'val d\'isere', 'tignes', 'chamonix', 'les arcs', 'la plagne',
    'cervinia', 'courmayeur', 'sestriere', 'livigno', 'bormio',
    'madonna di campiglio', 'cortina', 'selva di val gardena',
    'san candido', 'kronplatz', 'plan de corones',
    'zermatt', 'st. moritz', 'davos', 'verbier', 'crans-montana',
  ];

  const lower = text.toLowerCase();
  for (const r of resorts) {
    if (lower.includes(r)) {
      // Try to capture with qualifier (e.g. "Courchevel 1850")
      const idx = lower.indexOf(r);
      const after = text.slice(idx + r.length, idx + r.length + 10).trim();
      const numMatch = after.match(/^(\d{4})/);
      const original = text.slice(idx, idx + r.length);
      return numMatch ? `${original} ${numMatch[1]}` : original;
    }
  }
  return null;
}

function extractMeetingPoint(text: string): string | null {
  // "meeting point: X" / "punto di ritrovo: X" / "Preferred meeting point: X"
  const patterns = [
    /(?:meeting\s*point|punto\s*di\s*ritrovo|ritrovo)\s*[:;]\s*(.+?)(?:\.|$)/im,
    /(?:preferred\s*meeting\s*point|luogo\s*di\s*incontro)\s*[:;]\s*(.+?)(?:\.|$)/im,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[1].trim();
  }
  return null;
}

function extractCustomerName(text: string): string | null {
  // "My name is Sara" / "Mi chiamo Marco" / "I'm Sara" / "Sono Marco"
  const patterns = [
    /(?:my name is|i'?m|i am|mi chiamo|sono)\s+([A-Z][a-zA-Zà-ú]+)/i,
    /(?:name|nome)\s*[:;]\s*([A-Z][a-zA-Zà-ú]+(?:\s+[A-Z][a-zA-Zà-ú]+)?)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[1].trim();
  }
  return null;
}

function extractSport(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bsnowboard/i.test(lower)) return 'snowboard';
  if (/\bski\b|\bsci\b/i.test(lower)) return 'ski';
  if (/\btelemark/i.test(lower)) return 'telemark';
  return null;
}

// ── Main extractor ─────────────────────────────────────────────────────────

export function extractBookingFields(messageText: string): BookingExtractionResult {
  const times = extractTimes(messageText);
  const duration = extractDuration(messageText);

  // If we have start and end times but no explicit duration, compute it
  let durationMinutes = duration;
  if (times.startTime && times.endTime && !durationMinutes) {
    const [sh, sm] = times.startTime.split(':').map(Number);
    const [eh, em] = times.endTime.split(':').map(Number);
    durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMinutes <= 0) durationMinutes = null;
  }

  // If we have start and duration but no end time, compute end
  let endTime = times.endTime;
  if (times.startTime && durationMinutes && !endTime) {
    const [sh, sm] = times.startTime.split(':').map(Number);
    const totalMin = sh * 60 + sm + durationMinutes;
    const eh = Math.floor(totalMin / 60) % 24;
    const em = totalMin % 60;
    endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }

  const fields: ExtractedBookingFields = {
    date: extractDate(messageText),
    startTime: times.startTime,
    endTime,
    durationMinutes,
    partySize: extractPartySize(messageText),
    skillLevel: extractSkillLevel(messageText),
    lessonType: extractLessonType(messageText),
    resort: extractResort(messageText),
    meetingPointText: extractMeetingPoint(messageText),
    customerName: extractCustomerName(messageText),
    sport: extractSport(messageText),
  };

  // Completeness check
  const missing: string[] = [];
  for (const key of REQUIRED_FIELDS) {
    if (fields[key] === null || fields[key] === undefined) {
      missing.push(key);
    }
  }
  if (!hasTimeRange(fields)) {
    missing.push('endTime_or_duration');
  }

  // Confidence based on how many fields were extracted
  const totalFields = Object.keys(fields).length;
  const filledFields = Object.values(fields).filter((v) => v !== null).length;
  const extractionConfidence = Math.min(0.95, filledFields / totalFields);

  return {
    fields,
    complete: missing.length === 0,
    missingFields: missing,
    extractionConfidence,
  };
}
