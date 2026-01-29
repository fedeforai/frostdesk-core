/**
 * WhatsApp Outbound Integration
 * 
 * Sends WhatsApp messages via Meta Cloud API.
 * 
 * WHAT IT DOES:
 * - Sends text messages to WhatsApp users via Meta API
 * - Uses native fetch (no external dependencies)
 * - Throws on non-2xx responses
 * 
 * WHAT IT DOES NOT DO:
 * - No retry logic
 * - No logging (except Fastify's built-in error logging)
 * - No message queuing
 * - No rate limiting
 */

export interface SendWhatsAppAckParams {
  phoneNumberId: string;
  to: string; // sender phone number (from field)
  messageText: string;
}

/**
 * Sends a WhatsApp ACK message via Meta Cloud API.
 * 
 * @param params - ACK parameters
 * @throws Error if API call fails (non-2xx response or network error)
 */
export async function sendWhatsAppAck(
  params: SendWhatsAppAckParams
): Promise<void> {
  const { phoneNumberId, to, messageText } = params;

  const token = process.env.META_WHATSAPP_TOKEN;
  if (!token) {
    throw new Error('META_WHATSAPP_TOKEN environment variable is required');
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: messageText,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
}
