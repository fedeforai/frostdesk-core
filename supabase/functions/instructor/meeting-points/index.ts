import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  getInstructorMeetingPointsService,
  createInstructorMeetingPointService,
  updateInstructorMeetingPointService,
} from '../../../../packages/db/src/instructor_meeting_points_service.js';

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

    // GET: List meeting points
    if (req.method === 'GET') {
      const meetingPoints = await getInstructorMeetingPointsService(userId);
      
      return new Response(JSON.stringify(meetingPoints), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // POST: Create meeting point
    if (req.method === 'POST') {
      const body = await req.json();
      const { name, description, address, latitude, longitude, what3words, is_default } = body;

      // Validate required fields
      if (!name || !description || is_default === undefined) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const meetingPoint = await createInstructorMeetingPointService(userId, {
        name: name.trim(),
        description: description.trim(),
        address: address ? address.trim() : null,
        latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
        what3words: what3words ? what3words.trim() : null,
        is_default: Boolean(is_default),
      });

      return new Response(JSON.stringify(meetingPoint), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // PUT: Update meeting point
    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const meetingPointId = pathParts[pathParts.length - 1];

      if (!meetingPointId) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const body = await req.json();
      const { name, description, address, latitude, longitude, what3words, is_default, is_active } = body;

      // Validate required fields
      if (!name || !description || is_default === undefined || is_active === undefined) {
        return new Response(JSON.stringify({ error: { code: 'invalid_input' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const meetingPoint = await updateInstructorMeetingPointService(userId, meetingPointId, {
        name: name.trim(),
        description: description.trim(),
        address: address ? address.trim() : null,
        latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
        what3words: what3words ? what3words.trim() : null,
        is_default: Boolean(is_default),
        is_active: Boolean(is_active),
      });

      return new Response(JSON.stringify(meetingPoint), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Method not allowed
    return new Response(JSON.stringify({ error: { code: 'method_not_allowed' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (error) {
    // Default to 500
    return new Response(JSON.stringify({ error: { code: 'internal_error' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
