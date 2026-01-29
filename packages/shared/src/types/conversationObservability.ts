export type ConversationObservability = {
  conversation_id: string;

  // AI understanding
  last_intent: string | null;
  confidence: number | null;

  // Control & state
  conversation_state: 'active' | string; // Always 'active' in pilot mode
  automation_enabled: boolean;

  // Escalation
  handoff_to_human: boolean;
  escalation_reason: string | null;
  escalated_at: string | null;

  // Flow
  turn_count: number;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
};
