import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  getInstructorAvailabilityService,
  createInstructorAvailabilityService,
  updateInstructorAvailabilityService,
  deactivateInstructorAvailabilityService,
} from '../../../../packages/db/src/instructor_availability_service.js';

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

    // Route based on HTTP method
    switch (req.method) {
      case 'GET': {
        const items = await getInstructorAvailabilityService(userId);
        return new Response(JSON.stringify({ items }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'POST': {
        const body = await req.json();
        const { dayOfWeek, startTime, endTime, isActive } = body;

        // Validate required fields
        if (
          typeof dayOfWeek !== 'number' ||
          typeof startTime !== 'string' ||
          typeof endTime !== 'string' ||
          typeof isActive !== 'boolean'
        ) {
          return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        await createInstructorAvailabilityService(userId, {
          dayOfWeek,
          startTime,
          endTime,
          isActive,
        });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'PUT': {
        const body = await req.json();
        const { id, dayOfWeek, startTime, endTime, isActive } = body;

        // Validate required fields
        if (
          typeof id !== 'string' ||
          typeof dayOfWeek !== 'number' ||
          typeof startTime !== 'string' ||
          typeof endTime !== 'string' ||
          typeof isActive !== 'boolean'
        ) {
          return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        await updateInstructorAvailabilityService(userId, {
          id,
          dayOfWeek,
          startTime,
          endTime,
          isActive,
        });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'DELETE': {
        // Extract ID from URL path: /instructor/availability/:id
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

        if (!id || id === 'availability') {
          return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        await deactivateInstructorAvailabilityService(userId, id);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      default:
        return new Response(JSON.stringify({ error: { code: 'method_not_allowed' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 405,
        });
    }
  } catch (error) {
    // Default to 500
    return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
