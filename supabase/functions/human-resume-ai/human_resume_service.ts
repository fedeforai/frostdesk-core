import { SupabaseClient } from "@supabase/supabase-js";

export type ResumeAIResult = {
  ok: true;
};

export async function resumeAIForConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ResumeAIResult> {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, conversation_state, handoff_to_human, automation_enabled")
    .eq("id", conversationId)
    .single();

  if (error || !conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.conversation_state !== "requires_human") {
    throw new Error("Conversation is not in requires_human state");
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      conversation_state: "active",
      handoff_to_human: false,
      automation_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    throw updateError;
  }

  return { ok: true };
}
