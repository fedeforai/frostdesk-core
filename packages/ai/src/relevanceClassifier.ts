/**
 * Relevance Classifier (PILOT-SAFE)
 * 
 * Determines if an inbound message is relevant to FrostDesk's domain
 * (ski lessons, instructor services, bookings).
 * 
 * WHAT IT DOES:
 * - Analyzes message text for domain relevance
 * - Returns relevance decision with confidence
 * - Provides reason if not relevant
 * 
 * WHAT IT DOES NOT DO:
 * - No response generation
 * - No conversation state changes
 * - No side effects
 */

export type RelevanceReason = 'OUT_OF_DOMAIN' | 'SMALL_TALK' | 'SPAM';

export interface RelevanceResult {
  relevant: boolean;
  relevanceConfidence: number; // 0-1
  reason?: RelevanceReason;
}

/**
 * Classifies message relevance to FrostDesk domain.
 * 
 * A message is RELEVANT if it:
 * - Mentions ski lessons, bookings, scheduling
 * - Asks about instructor services
 * - Requests information about services
 * 
 * A message is NOT RELEVANT if it:
 * - Is a greeting ("hi", "hello", "ciao")
 * - Is an acknowledgement ("thanks", "ok", "okay")
 * - Is small talk ("how are you", "what's up")
 * - Is spam or unrelated
 * 
 * @param input - Message input
 * @returns Relevance classification result
 */
export async function classifyRelevance(input: {
  messageText: string;
  channel: 'whatsapp';
  language?: string;
}): Promise<RelevanceResult> {
  const text = input.messageText.toLowerCase().trim();

  // PILOT MODE: Deterministic pattern matching
  // This is a stub that uses keyword matching for pilot phase

  // Non-relevant patterns (high confidence)
  const smallTalkPatterns = [
    /^(hi|hello|hey|ciao|salve|buongiorno|buonasera)$/i,
    /^(thanks|thank you|grazie|grazie mille)$/i,
    /^(ok|okay|va bene|perfetto|bene)$/i,
    /^(how are you|come stai|come va)$/i,
    /^(what's up|cosa succede)$/i,
    /^(bye|goodbye|arrivederci|ciao)$/i,
  ];

  const spamPatterns = [
    /(free|gratis|win|vinci|prize|premio|click here|clicca qui)/i,
    /(urgent|urgente|limited time|tempo limitato)/i,
  ];

  // Check for small talk
  for (const pattern of smallTalkPatterns) {
    if (pattern.test(text)) {
      return {
        relevant: false,
        relevanceConfidence: 0.95,
        reason: 'SMALL_TALK',
      };
    }
  }

  // Check for spam
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return {
        relevant: false,
        relevanceConfidence: 0.9,
        reason: 'SPAM',
      };
    }
  }

  // Relevant patterns (domain-specific keywords)
  const relevantKeywords = [
    // Booking-related
    'prenot', 'booking', 'reserv', 'prenota', 'prenotazione',
    'lesson', 'lezione', 'corso', 'course',
    'sci', 'ski', 'snowboard',
    'instructor', 'istruttore', 'maestro',
    'schedule', 'orario', 'disponibil', 'availability',
    'price', 'prezzo', 'cost', 'costo',
    'cancel', 'cancella', 'annulla',
    'change', 'cambia', 'modifica', 'reschedule',
    'info', 'informazioni', 'information',
    'when', 'quando', 'where', 'dove',
    'how much', 'quanto costa',
  ];

  let relevanceScore = 0;
  let matchedKeywords = 0;

  for (const keyword of relevantKeywords) {
    if (text.includes(keyword)) {
      matchedKeywords++;
      relevanceScore += 0.3; // Each keyword adds to relevance
    }
  }

  // Normalize confidence (0-1 range, capped at 0.95)
  const relevanceConfidence = Math.min(0.95, Math.min(1.0, relevanceScore / 2));

  // Threshold: relevanceConfidence >= 0.6 means relevant
  const relevant = relevanceConfidence >= 0.6;

  if (!relevant) {
    return {
      relevant: false,
      relevanceConfidence,
      reason: 'OUT_OF_DOMAIN',
    };
  }

  return {
    relevant: true,
    relevanceConfidence,
  };
}
