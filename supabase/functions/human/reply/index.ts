import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { mapErrorToResponse } from '../../admin/_shared/error_mapper.ts';
import { sendHumanReply } from '../../../../packages/db/src/human_reply_service.js';

Deno.serve(async (req: Request) => {
  try {
    // Standard Supabase auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get Supabase URL and anon key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Create Supabase client with auth header
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Parse request body
    const body = await req.json();
    const { conversationId, content } = body;

    // Validate input
    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Call service
    const result = await sendHumanReply({
      conversationId: conversationId.trim(),
      authorUserId: user.id,
      content: content.trim(),
    });

    // Return response
    return new Response(JSON.stringify({ messageId: result.messageId }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const { status, body } = mapErrorToResponse(error);
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status,
    });
  }
});
