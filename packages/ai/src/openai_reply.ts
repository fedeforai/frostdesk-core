import OpenAI from 'openai';

export interface GenerateAIReplyInput {
  lastMessageText: string;
  language?: string;
  /** Optional conversation history for context (e.g. last N messages). */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /**
   * Loop C: Structured customer context injected into the system prompt.
   * Factual, read-only. Example:
   *   "Customer history (factual, not prescriptive):\n- Last duration: 120 minutes\n..."
   * Must include the anti-auto-booking guardrail line.
   */
  customerContext?: string | null;
  /**
   * Loop C: Detected language code (e.g. 'it', 'en', 'de').
   * When provided, the prompt instructs the model to reply in this language.
   */
  detectedLanguage?: string | null;
  /**
   * When set, instructs the model to ask for these before the instructor can confirm and send the payment link.
   */
  missingFields?: string[] | null;
  /**
   * When true, the writer may be booking on behalf of a guest (agency/concierge). Ask for guest name if missing.
   */
  isThirdPartyBooking?: boolean | null;
}

export interface GenerateAIReplyOutput {
  replyText: string;
  model?: string;
}

const BASE_SYSTEM_PROMPT = `You are a friendly booking concierge for a ski/snowboard instructor platform (FrostDesk).
Reply briefly and helpfully in the same language as the customer's last message.
Do not make up availability or prices unless you receive a [RESCHEDULE VERIFIED] context — in that case, you may confirm the slot is available using the verified data provided.
Keep replies short (1-3 sentences). Do not use markdown or lists unless the user asked for structure.`;

/** Language code to full name for clear model instructions. */
const LANGUAGE_NAMES: Record<string, string> = {
  it: 'Italian',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  nl: 'Dutch',
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}

/**
 * Builds the full system prompt, optionally enriched with customer context
 * and language instructions (Loop C). When detectedLanguage is set, the model
 * is instructed to reply only in that language so suggestions match the conversation.
 */
function buildSystemPrompt(input: GenerateAIReplyInput): string {
  const parts = [BASE_SYSTEM_PROMPT];

  // Loop C: customer history context (factual, not prescriptive)
  if (input.customerContext) {
    parts.push(input.customerContext);
  }

  // Loop C: explicit language — reply in the same language as the conversation
  if (input.detectedLanguage) {
    const langName = getLanguageName(input.detectedLanguage);
    parts.push(
      `The conversation is in ${langName}. You must reply only in ${langName}. Do not switch to another language.`,
    );
  }

  // Booking confirmation: before the instructor can confirm and send the payment link, minimal info is needed.
  if (input.missingFields?.length) {
    const list = input.missingFields.join(', ');
    parts.push(
      `Before the instructor can confirm and send the payment link, the following are still needed: ${list}. If something is missing, ask for it briefly (one thing at a time). Do not invent values.`,
    );
  }

  // Third-party (agency/concierge): ask for guest name when booking on behalf of someone else.
  if (input.isThirdPartyBooking) {
    parts.push(
      'The person writing may be booking on behalf of a guest. Always ask for the guest\'s full name if not yet provided. Use phrases like "nome dell\'ospite" (Italian) or "guest name" (English) according to the conversation language.',
    );
  }

  return parts.join('\n\n');
}

/**
 * Calls OpenAI Chat Completions API (ChatGPT) to generate a reply.
 * Requires OPENAI_API_KEY to be set. Use generateAIReply() for automatic fallback when key is missing.
 */
export async function generateAIReplyOpenAI(
  input: GenerateAIReplyInput
): Promise<GenerateAIReplyOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key') {
    throw new Error('OPENAI_API_KEY is not set or is placeholder');
  }

  const openai = new OpenAI({ apiKey });
  const systemPrompt = buildSystemPrompt(input);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (input.conversationHistory?.length) {
    for (const m of input.conversationHistory) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  messages.push({ role: 'user', content: input.lastMessageText });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 256,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (content == null) {
    throw new Error('OpenAI returned empty content');
  }

  return {
    replyText: content,
    model: completion.model ?? 'gpt-4o-mini',
  };
}
