import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, params }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        country(*),
        stories(
          *,
          beats: story_beats(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json() as any;

    const { data, error } = await supabase
      .from('videos')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id } = params;

    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data: { id } }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
