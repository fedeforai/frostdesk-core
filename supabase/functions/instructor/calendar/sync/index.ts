import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getInstructorCalendarConnection } from '../../../../../packages/db/src/instructor_calendar_repository.js';
import { refreshAccessToken, fetchEvents, type GoogleCalendarEvent } from '../../../../../packages/integrations/google_calendar_adapter.ts';
import { syncCalendarReadOnly, connectGoogleCalendar } from '../../../../../packages/db/src/instructor_calendar_service.js';
import type { InsertCalendarEventParams } from '../../../../../packages/db/src/calendar_events_cache_repository.js';

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

    // Get calendar connection
    const connection = await getInstructorCalendarConnection(userId);
    if (!connection) {
      return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    let refreshToken = connection.refresh_token;
    let expiresAt = connection.expires_at;

    if (connection.expires_at) {
      const expiresAtDate = new Date(connection.expires_at);
      const now = new Date();
      // Refresh if expired or expires within 5 minutes
      if (expiresAtDate <= new Date(now.getTime() + 5 * 60 * 1000)) {
        if (!refreshToken) {
          return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const refreshResult = await refreshAccessToken(refreshToken);
        accessToken = refreshResult.access_token;
        expiresAt = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString();

        // Update connection with new token
        await connectGoogleCalendar(userId, {
          access_token: accessToken,
          refresh_token: refreshToken, // Keep existing refresh token
          calendar_id: connection.calendar_id,
          expires_at: expiresAt,
        });
      }
    }

    // Fetch events from Google Calendar
    const eventsResult = await fetchEvents(accessToken, connection.calendar_id);

    // Transform Google events to cache format (no intelligent parsing, just direct mapping)
    const cacheEvents: InsertCalendarEventParams[] = eventsResult.items.map((event: GoogleCalendarEvent) => {
      // Extract start/end times (events as they come from Google)
      const startAt = event.start?.dateTime || event.start?.date || new Date().toISOString();
      const endAt = event.end?.dateTime || event.end?.date || new Date().toISOString();
      const isAllDay = !event.start?.dateTime && !!event.start?.date;

      return {
        instructor_id: userId,
        provider: 'google',
        external_event_id: event.id || '',
        start_at: startAt,
        end_at: endAt,
        title: event.summary || null,
        is_all_day: isAllDay,
      };
    });

    // Sync to cache (clear + insert)
    await syncCalendarReadOnly(userId, cacheEvents);

    // Return success
    return new Response(JSON.stringify({ 
      success: true,
      eventsCount: cacheEvents.length,
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
