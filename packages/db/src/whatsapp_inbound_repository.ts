import { sql } from './client.js';

export async function insertWhatsappInboundRaw(payload: any): Promise<string> {
  const senderId = payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id ?? null;
  const messageId = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? null;

  const result = await sql<{ id: string }[]>`
    INSERT INTO whatsapp_inbound_raw (
      channel,
      provider,
      sender_id,
      message_id,
      payload,
      signature_valid
    ) VALUES (
      'whatsapp',
      'meta',
      ${senderId},
      ${messageId},
      ${JSON.stringify(payload)}::jsonb,
      false
    )
    RETURNING id
  `;

  return result[0].id;
}

export async function listWhatsappInboundRaw(): Promise<any[]> {
  const result = await sql<any[]>`
    SELECT 
      id,
      received_at,
      sender_id,
      message_id,
      signature_valid
    FROM whatsapp_inbound_raw
    ORDER BY received_at DESC
    LIMIT 100
  `;

  return result;
}
