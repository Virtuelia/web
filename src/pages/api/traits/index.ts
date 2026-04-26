import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, url }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const competency = url.searchParams.get('competency');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('sel_traits')
      .select('*', { count: 'exact' });

    if (competency) {
      query = query.eq('competency', competency);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.order('competency', { ascending: true })
      .order('category', { ascending: true })
      .order('name', { ascending: true })
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
