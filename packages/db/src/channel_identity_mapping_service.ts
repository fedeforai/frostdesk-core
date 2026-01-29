import { sql } from './client.js';

export interface ChannelIdentityMapping {
  id: string;
  channel: string;
  customer_identifier: string;
  conversation_id: string;
  created_at: string;
}

export async function listChannelIdentityMappings(): Promise<ChannelIdentityMapping[]> {
  const result = await sql<ChannelIdentityMapping[]>`
    SELECT 
      id,
      channel,
      customer_identifier,
      conversation_id,
      created_at
    FROM channel_identity_mapping
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return result;
}
