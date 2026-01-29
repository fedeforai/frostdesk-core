export interface ChannelIdentityMapping {
  channel: string;
  customer_identifier: string;
  conversation_id: string;
  created_at: string;
}

export function findChannelIdentityMapping(
  channel: string,
  customerIdentifier: string
): Promise<ChannelIdentityMapping | null>;

export function insertChannelIdentityMapping(
  channel: string,
  customerIdentifier: string,
  conversationId: string
): Promise<void>;
