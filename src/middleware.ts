import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const runtime = (context.locals as any).runtime?.env;
  const supabaseUrl = runtime?.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = runtime?.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey);

  // Get session from cookie
  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (accessToken && refreshToken) {
    const { data: { user }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      // Clear invalid cookies
      context.cookies.delete('sb-access-token', { path: '/' });
      context.cookies.delete('sb-refresh-token', { path: '/' });
    }

    context.locals.user = user;
  }

  context.locals.supabase = supabase;

  // Protect dashboard routes
  const protectedPaths = ['/dashboard'];
  const isProtected = protectedPaths.some(p => context.url.pathname.startsWith(p));

  if (isProtected && !context.locals.user) {
    return context.redirect('/login');
  }

  return next();
});
