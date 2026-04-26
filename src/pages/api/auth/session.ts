import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { access_token, refresh_token } = await request.json();

  if (!access_token || !refresh_token) {
    return new Response('Missing tokens', { status: 400 });
  }

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
  };

  cookies.set('sb-access-token', access_token, {
    ...cookieOptions,
    maxAge: 60 * 60, // 1 hour
  });

  cookies.set('sb-refresh-token', refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return new Response('OK', { status: 200 });
};
