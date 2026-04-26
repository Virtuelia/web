import type { APIRoute } from 'astro';

export const PATCH: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Check if user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin' && currentProfile?.role !== 'creator') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const body = await request.json() as any;
    const { member_id, role } = body;

    if (!member_id || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: member_id, role' }),
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'creator', 'sel_reviewer', 'media_producer', 'viewer'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', member_id)
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
