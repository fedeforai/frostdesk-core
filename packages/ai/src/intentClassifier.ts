/**
 * Intent Classifier (PILOT-SAFE)
 * 
 * Classifies intent for messages that are relevant to FrostDesk domain.
 * 
 * WHAT IT DOES:
 * - Analyzes relevant messages for intent
 * - Returns intent classification with confidence
 * - Uses closed intent enum (no UNKNOWN)
 * 
 * WHAT IT DOES NOT DO:
 * - No response generation
 * - No conversation state changes
 * - No side effects
 */

export type IntentType = 'NEW_BOOKING' | 'RESCHEDULE' | 'CANCEL' | 'INFO_REQUEST';

export interface IntentResult {
  intent: IntentType;
  intentConfidence: number; // 0-1
  model: string;
}

/**
 * Classifies intent for relevant messages.
 * 
 * Only called when message is relevant (relevant === true).
 * 
 * Intent types:
 * - NEW_BOOKING: Request for new booking/lesson
 * - RESCHEDULE: Request to change existing booking
 * - CANCEL: Request to cancel booking
 * - INFO_REQUEST: Request for information about services
 * 
 * @param input - Message input (assumed to be relevant)
 * @returns Intent classification result
 */
export async function classifyIntent(input: {
  messageText: string;
  channel: 'whatsapp';
  language?: string;
}): Promise<IntentResult> {
  const text = input.messageText.toLowerCase().trim();

  // PILOT MODE: Deterministic pattern matching
  // This is a stub that uses keyword matching for pilot phase

  // Intent patterns with confidence scoring
  const intentPatterns: Array<{
    intent: IntentType;
    patterns: RegExp[];
    baseConfidence: number;
  }> = [
    {
      intent: 'CANCEL',
      patterns: [
        /(cancel|annulla|disdici|rimuovi|elimina).*(prenot|booking|lesson|lezione)/i,
        /(non voglio|non posso|non riesco).*(prenot|booking|lesson|lezione)/i,
        /(rinuncia|rinuncio)/i,
      ],
      baseConfidence: 0.85,
    },
    {
      intent: 'RESCHEDULE',
      patterns: [
        /(cambia|change|modifica|sposta|posticipa|anticipa).*(prenot|booking|lesson|lezione|data|orario)/i,
        /(reschedule|riprogramma|riprogrammare)/i,
        /(altro giorno|altra data|altro orario)/i,
        /(move|postpone|bring forward|push back).*(lesson|booking|session|class|appointment)/i,
      ],
      baseConfidence: 0.85,
    },
    {
      intent: 'NEW_BOOKING',
      patterns: [
        /(voglio|vorrei|posso|puoi).*(prenot|booking|lesson|lezione)/i,
        /(prenota|prenotare|prenotazione|booking)/i,
        /(disponibil|availability|libero|free).*(giorno|day|data|date)/i,
        /(quando|when).*(posso|puoi|possiamo).*(fare|prenotare|prenotare)/i,
        /(want|would like|i'd like|like to).*(lesson|booking|session|class)/i,
        /(book|reserve).*(lesson|session|class|instructor)/i,
        /\b(private|group)\s+(ski|snowboard)?\s*(lesson|session|class)\b/i,
      ],
      baseConfidence: 0.8,
    },
    {
      intent: 'INFO_REQUEST',
      patterns: [
        /(quanto costa|how much|prezzo|price|tariffa|rates?|pricing|fee)/i,
        /(info|informazioni|information|dettagli|details)/i,
        /(cosa|what).*(offri|offer|servizi|services)/i,
        /(dove|where).*(sei|are you|location|posizione)/i,
        /(come|how).*(funziona|works|prenotare|book)/i,
        /(do you).*(teach|offer|do|have).*(lesson|class|session|course)/i,
      ],
      baseConfidence: 0.75,
    },
  ];

  // Score each intent
  let bestIntent: IntentType = 'INFO_REQUEST'; // Default fallback
  let bestConfidence = 0.5;
  let bestModel = 'stub-v1';

  for (const { intent, patterns, baseConfidence } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        // If pattern matches, use base confidence
        if (baseConfidence > bestConfidence) {
          bestIntent = intent;
          bestConfidence = baseConfidence;
        }
      }
    }
  }

  // If no strong match, default with fallback logic
  if (bestConfidence < 0.6) {
    // Check if it's clearly a booking request (keyword fallback)
    if (/(prenot|booking|lesson|lezione|session|class)/i.test(text)) {
      bestIntent = 'NEW_BOOKING';
      bestConfidence = 0.76; // Above INTENT_MIN_DRAFT (0.75) so drafts can be generated
    } else if (/(rate|price|cost|info|how much|quanto)/i.test(text)) {
      bestIntent = 'INFO_REQUEST';
      bestConfidence = 0.76;
    } else {
      bestIntent = 'INFO_REQUEST';
      bestConfidence = 0.6;
    }
  }

  return {
    intent: bestIntent,
    intentConfidence: bestConfidence,
    model: bestModel,
  };
}
