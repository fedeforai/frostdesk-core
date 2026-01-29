// OUT OF PILOT SCOPE – Disabled in FrostDesk v1 Pilot
// 
// PILOT MODE v1: WhatsApp inbound MUST go through Fastify API only.
// This Edge Function is disabled to prevent conflicts with the pilot schema.
//
// The pilot webhook path is:
//   Fastify API → webhook_whatsapp.ts → persistInboundMessageWithInboxBridge
//
// This Edge Function requires message_type which is not in the pilot schema.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * OUT OF PILOT SCOPE – WhatsApp handled by Fastify API
 * 
 * This Edge Function is disabled for FrostDesk v1 Pilot.
 * All WhatsApp inbound messages must go through the Fastify API webhook.
 */
Deno.serve(async (req: Request) => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'OUT_OF_PILOT_SCOPE',
      message: 'WhatsApp webhook is handled by Fastify API. This Edge Function is disabled in Pilot Mode v1.',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 503, // Service Unavailable
    }
  );
});
