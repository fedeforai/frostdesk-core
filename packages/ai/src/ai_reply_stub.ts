export function generateAIReply(input: {
  lastMessageText: string;
  language?: string;
}): {
  replyText: string;
} {
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
