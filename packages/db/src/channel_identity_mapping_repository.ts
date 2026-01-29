import { sql } from './client.js';

export interface ChannelIdentityMapping {
  channel: string;
  customer_identifier: string;
  conversation_id: string;
  created_at: string;
}

export async function findChannelIdentityMapping(
  channel: string,
  customerIdentifier: string
): Promise<ChannelIdentityMapping | null> {
  const rows = await sql<ChannelIdentityMapping[]>`
    SELECT
      channel,
      customer_identifier,
      conversation_id,
      created_at
    FROM channel_identity_mapping
    WHERE channel = ${channel}
      AND customer_identifier = ${customerIdentifier}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function insertChannelIdentityMapping(
  channel: string,
  customerIdentifier: string,
  conversationId: string
): Promise<void> {
  await sql`
    INSERT INTO channel_identity_mapping (
      channel,
      customer_identifier,
      conversation_id
    )
    VALUES (
      ${channel},
      ${customerIdentifier},
      ${conversationId}
    )
    ON CONFLICT (channel, customer_identifier) DO NOTHING
  `;
}
