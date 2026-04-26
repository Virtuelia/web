import type { APIRoute } from 'astro';
import type { Video } from '@/lib/database.types';
import { slugify } from '@/lib/helpers';

export const GET: APIRoute = async ({ locals, url }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('videos')
      .select('*, country:countries(*), stories(id)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    const videos = (data as any[]).map((v) => ({
      ...v,
      stories_count: v.stories?.length || 0,
      stories: undefined,
    }));

    return new Response(JSON.stringify({ data: videos, count, limit, offset }), { status: 200 });
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
    const { title, content_type, age_range, ...rest } = body;

    if (!title || !content_type || !age_range) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, content_type, age_range' }),
        { status: 400 }
      );
    }

    const slug = slugify(title);

    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        slug,
        content_type,
        age_range,
        created_by: locals.user.id,
        planned_story_count: 0,
        status: 'concept',
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
