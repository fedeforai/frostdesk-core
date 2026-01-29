/**
 * Draft Quality Guardrails (PILOT-SAFE)
 * 
 * Ensures AI drafts are safe, neutral, and professional.
 * 
 * WHAT THIS DOES:
 * - Validates draft text against quality rules
 * - Blocks drafts with commitments, invented data, or assertive tone
 * - Adds mandatory disclaimer for human review
 * 
 * WHAT THIS DOES NOT DO:
 * - No draft generation
 * - No conversation state changes
 * - No side effects
 * - Pure function, deterministic
 */

export type IntentType = 'NEW_BOOKING' | 'RESCHEDULE' | 'CANCEL' | 'INFO_REQUEST' | null;

export interface DraftQualityInput {
  rawDraftText: string;
  intent: IntentType;
  language?: string;
}

export interface DraftViolation {
  rule: string;
  reason: string;
  severity: 'blocking' | 'warning';
}

export interface DraftQualityOutput {
  safeDraftText: string | null;
  violations: DraftViolation[];
}

/**
 * Sanitizes draft text by applying quality guardrails.
 * 
 * Rules:
 * 1. No commitments (blocking)
 * 2. No invented data (blocking)
 * 3. Tone check - no assertive statements (blocking)
 * 4. Mandatory disclaimer (warning, auto-fixed)
 * 
 * @param input - Draft text and context
 * @returns Sanitized text or null if blocked, with violations list
 */
export function sanitizeDraftText(input: DraftQualityInput): DraftQualityOutput {
  const { rawDraftText, intent, language = 'en' } = input;
  const violations: DraftViolation[] = [];
  let text = rawDraftText.trim();

  // Rule 1: No Commitment Detection
  const commitmentPatterns = language === 'it' 
    ? [
        /ti\s+confermo|confermo|è\s+disponibile|disponibile|il\s+prezzo|prezzo\s+è|prenotazione\s+effettuata|prenotato|confermato/i,
        /posso\s+confermare|posso\s+prenotare|posso\s+garantire/i,
      ]
    : [
        /i\s+confirm|confirmed|is\s+available|available|the\s+price|price\s+is|booking\s+confirmed|booked/i,
        /can\s+confirm|can\s+book|can\s+guarantee/i,
      ];

  for (const pattern of commitmentPatterns) {
    if (pattern.test(text)) {
      violations.push({
        rule: 'NO_COMMITMENT',
        reason: 'Draft contains commitment language (confirmation, availability, price, booking)',
        severity: 'blocking',
      });
      break;
    }
  }

  // Rule 2: No Assumptions Detection (invented data)
  // Block specific dates
  const datePatterns = language === 'it'
    ? [
        /domani|dopodomani|(lun|mar|mer|gio|ven|sab|dom)edì|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre/i,
        /\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/i,
      ]
    : [
        /tomorrow|day after tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december/i,
        /\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      ];

  for (const pattern of datePatterns) {
    if (pattern.test(text)) {
      violations.push({
        rule: 'NO_ASSUMPTIONS_DATE',
        reason: 'Draft contains specific date (should not invent dates)',
        severity: 'blocking',
      });
      break;
    }
  }

  // Block specific times
  const timePatterns = language === 'it'
    ? [
        /alle\s+\d{1,2}|alle\s+\d{1,2}:\d{2}|dalle\s+\d{1,2}|dalle\s+\d{1,2}:\d{2}/i,
        /\d{1,2}:\d{2}/,
      ]
    : [
        /at\s+\d{1,2}|at\s+\d{1,2}:\d{2}|from\s+\d{1,2}|from\s+\d{1,2}:\d{2}/i,
        /\d{1,2}:\d{2}\s*(am|pm)?/i,
      ];

  for (const pattern of timePatterns) {
    if (pattern.test(text)) {
      violations.push({
        rule: 'NO_ASSUMPTIONS_TIME',
        reason: 'Draft contains specific time (should not invent times)',
        severity: 'blocking',
      });
      break;
    }
  }

  // Block specific prices
  const pricePatterns = language === 'it'
    ? [
        /\d+\s*euro|\d+\s*€|prezzo\s+è\s+\d+|costa\s+\d+/i,
      ]
    : [
        /\d+\s*(euro|dollars?|€|\$)|price\s+is\s+\d+|costs?\s+\d+/i,
      ];

  for (const pattern of pricePatterns) {
    if (pattern.test(text)) {
      violations.push({
        rule: 'NO_ASSUMPTIONS_PRICE',
        reason: 'Draft contains specific price (should not invent prices)',
        severity: 'blocking',
      });
      break;
    }
  }

  // Rule 3: Tone Check - Block assertive statements
  const assertivePatterns = language === 'it'
    ? [
        /puoi\s+prenotare|puoi\s+confermare|puoi\s+fare|devi\s+prenotare|devi\s+fare/i,
        /è\s+fatto|è\s+pronto|è\s+disponibile|è\s+confermato/i,
      ]
    : [
        /you\s+can\s+book|you\s+can\s+confirm|you\s+can\s+do|you\s+must\s+book|you\s+must\s+do/i,
        /it\s+is\s+done|it\s+is\s+ready|it\s+is\s+available|it\s+is\s+confirmed/i,
      ];

  for (const pattern of assertivePatterns) {
    if (pattern.test(text)) {
      violations.push({
        rule: 'TONE_CHECK',
        reason: 'Draft uses assertive tone instead of conditional/suggestive',
        severity: 'blocking',
      });
      break;
    }
  }

  // Check for blocking violations
  const blockingViolations = violations.filter(v => v.severity === 'blocking');
  if (blockingViolations.length > 0) {
    return {
      safeDraftText: null,
      violations,
    };
  }

  // Rule 4: Mandatory Disclaimer (warning, auto-fixed)
  const disclaimer = 'Suggested reply for human review.';
  if (!text.toLowerCase().includes(disclaimer.toLowerCase())) {
    text = `${disclaimer}\n\n${text}`;
    violations.push({
      rule: 'MANDATORY_DISCLAIMER',
      reason: 'Disclaimer added automatically',
      severity: 'warning',
    });
  }

  return {
    safeDraftText: text,
    violations,
  };
}
