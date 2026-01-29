import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationObservability } from '../../shared/src/types/conversationObservability.js';

export async function getConversationObservability(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ConversationObservability> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      last_intent,
      confidence,
      automation_enabled,
      handoff_to_human,
      escalation_reason,
      escalated_at,
      last_inbound_at,
      last_outbound_at
    `)
    .eq('id', conversationId)
    .single();

  if (error) throw error;

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  return {
    conversation_id: data.id,
    last_intent: data.last_intent,
    confidence: data.confidence,
    conversation_state: 'active',
    automation_enabled: data.automation_enabled,
    handoff_to_human: data.handoff_to_human,
    escalation_reason: data.escalation_reason,
    escalated_at: data.escalated_at,
    turn_count: count ?? 0,
    last_inbound_at: data.last_inbound_at,
    last_outbound_at: data.last_outbound_at,
  };
}
