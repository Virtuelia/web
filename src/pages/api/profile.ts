import type { APIRoute } from 'astro';

export const PATCH: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as any;
    const { full_name } = body;

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: full_name' }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name })
      .eq('email', user.email)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
