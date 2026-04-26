import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, url }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const videoId = url.searchParams.get('video_id');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('stories')
      .select('*, trait: primary_trait_id(*)', { count: 'exact' });

    if (videoId) {
      query = query.eq('video_id', videoId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('story_number', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data, count, limit, offset }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as any;
    const { video_id, story_number, primary_competency, lead_character, ...rest } = body;

    if (!video_id || story_number === undefined || !primary_competency || !lead_character) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: video_id, story_number, primary_competency, lead_character',
        }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('stories')
      .insert({
        video_id,
        story_number,
        primary_competency,
        lead_character,
        status: 'draft',
        duration_minutes: 5,
        sel_emotion_accurate: false,
        sel_tool_evidence_based: false,
        sel_resolution_realistic: false,
        sel_content_safe: false,
        sel_message_clear: false,
        sel_cultural_check: false,
        sel_approved: false,
        ...rest,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
