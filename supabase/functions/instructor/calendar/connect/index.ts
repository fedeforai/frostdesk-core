import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { exchangeAuthCode } from '../../../../../packages/integrations/google_calendar_adapter.ts';
import { connectGoogleCalendar } from '../../../../../packages/db/src/instructor_calendar_service.js';

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

    const userId = user.id;

    // POST only
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: { code: 'method_not_allowed' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Parse request body
    const body = await req.json();
    const { auth_code, calendar_id } = body;

    // Validate input
    if (!auth_code || typeof auth_code !== 'string' || auth_code.trim().length === 0) {
      return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!calendar_id || typeof calendar_id !== 'string' || calendar_id.trim().length === 0) {
      return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Exchange auth code for tokens
    const tokenResult = await exchangeAuthCode(auth_code.trim());

    // Calculate expires_at (current time + expires_in seconds)
    const expiresAt = tokenResult.expires_in
      ? new Date(Date.now() + tokenResult.expires_in * 1000).toISOString()
      : null;

    // Connect calendar
    const connection = await connectGoogleCalendar(userId, {
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      calendar_id: calendar_id.trim(),
      expires_at: expiresAt,
    });

    // Return response (exclude sensitive tokens)
    return new Response(JSON.stringify({
      id: connection.id,
      provider: connection.provider,
      calendar_id: connection.calendar_id,
      expires_at: connection.expires_at,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // Default to 500
    return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
