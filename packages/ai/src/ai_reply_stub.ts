import { generateAIReplyOpenAI } from './openai_reply.js';

export interface GenerateAIReplyInput {
  lastMessageText: string;
  language?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface GenerateAIReplyOutput {
  replyText: string;
  model?: string;
}

function getStubReply(input: GenerateAIReplyInput): GenerateAIReplyOutput {
  const language = input.language || 'en';

  if (language === 'it') {
    return {
      replyText: 'Grazie per il tuo messaggio. L\'abbiamo ricevuto e ti risponderemo a breve.',
    };
  }

  return {
    replyText: 'Thanks for your message. We\'ve received it and will get back to you shortly.',
  };
}

/**
 * Generates an AI reply. Uses OpenAI (ChatGPT) when OPENAI_API_KEY is set and valid,
 * otherwise returns a fixed stub reply.
 */
export async function generateAIReply(input: GenerateAIReplyInput): Promise<GenerateAIReplyOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey !== 'your_openai_api_key') {
    try {
      return await generateAIReplyOpenAI(input);
    } catch (err) {
      // Fallback to stub on API errors (e.g. rate limit, network)
      console.warn('[@frostdesk/ai] OpenAI reply failed, using stub:', err);
    }
  }

  return getStubReply(input);
}
