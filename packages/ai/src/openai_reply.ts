import OpenAI from 'openai';

export interface GenerateAIReplyInput {
  lastMessageText: string;
  language?: string;
  /** Optional conversation history for context (e.g. last N messages). */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface GenerateAIReplyOutput {
  replyText: string;
  model?: string;
}

const SYSTEM_PROMPT = `You are a friendly booking concierge for a ski/snowboard instructor platform (FrostDesk).
Reply briefly and helpfully in the same language as the user.
Do not make up availability or prices; suggest the user will get a personal reply from an instructor.
Keep replies short (1-3 sentences). Do not use markdown or lists unless the user asked for structure.`;

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

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
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
