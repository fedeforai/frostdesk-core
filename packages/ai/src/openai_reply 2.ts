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
}

export interface GenerateAIReplyOutput {
  replyText: string;
  model?: string;
}

const BASE_SYSTEM_PROMPT = `You are a friendly booking concierge for a ski/snowboard instructor platform (FrostDesk).
Reply briefly and helpfully in the same language as the user.
Do not make up availability or prices unless you receive a [RESCHEDULE VERIFIED] context — in that case, you may confirm the slot is available using the verified data provided.
Keep replies short (1-3 sentences). Do not use markdown or lists unless the user asked for structure.`;

/**
 * Builds the full system prompt, optionally enriched with customer context
 * and language instructions (Loop C).
 */
function buildSystemPrompt(input: GenerateAIReplyInput): string {
  const parts = [BASE_SYSTEM_PROMPT];

  // Loop C: customer history context (factual, not prescriptive)
  if (input.customerContext) {
    parts.push(input.customerContext);
  }

  // Loop C: explicit language instruction
  if (input.detectedLanguage) {
    parts.push(
      `Reply in ${input.detectedLanguage}. If uncertain about the customer's language, default to ${input.detectedLanguage}.`,
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
