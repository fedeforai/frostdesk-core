import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAIBookingSuggestionContextService } from '../../../../packages/db/src/ai_booking_suggestion_service.js';

Deno.serve(async (req: Request) => {
  // Auth check
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'FAILED_TO_LOAD_AI_BOOKING_CONTEXT' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }

  // Method check
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  // Service call
  try {
    const result = await getAIBookingSuggestionContextService(user.id);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'FAILED_TO_LOAD_AI_BOOKING_CONTEXT' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
