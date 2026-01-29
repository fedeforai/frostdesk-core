import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { listCalendarEvents } from '../../../../../packages/db/src/instructor_calendar_service.js';

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

    // GET only
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: { code: 'method_not_allowed' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;

    // List events
    const events = await listCalendarEvents(userId, {
      dateFrom,
      dateTo,
    });

    // Return events
    return new Response(JSON.stringify(events), {
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
