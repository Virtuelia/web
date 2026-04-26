import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
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
    const { name, code, ...rest } = body;

    if (!name || !code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, code' }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('countries')
      .insert({
        name,
        code,
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
