import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const POST: APIRoute = async ({ locals, params }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id } = params;

    const { data: video, error } = await supabase
      .from('videos')
      .select('*, country:countries(name, code)')
      .eq('id', id)
      .single();

    if (error || !video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 });
    }

    if (!video.child_name) {
      return new Response(JSON.stringify({ error: 'Child name is required before generating a character description' }), { status: 400 });
    }

    const runtime = (locals as any).runtime;
    const apiKey = runtime?.env?.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const childInfo = [
      `Name: ${video.child_name}`,
      video.child_age ? `Age: ${video.child_age} years old` : null,
      video.country?.name ? `Country/Culture: ${video.country.name}` : null,
      video.child_personality ? `Personality: ${video.child_personality}` : null,
      video.cultural_notes ? `Cultural context: ${video.cultural_notes}` : null,
      video.primary_theme ? `Story theme: ${video.primary_theme}` : null,
    ].filter(Boolean).join('\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are a character designer for Virtuelia, a children's SEL animated series in Pixar 3D style (ages 4-12).
Your job is to write a concise, specific visual character description for a child protagonist.
This description will be inserted directly into AI image generation prompts (nanobanana), so it must be:
- Concrete and visual (hair, eyes, skin, clothing, accessories)
- Culturally authentic to the child's country
- Consistent enough to produce the same-looking character across 20+ shots
- 2-3 sentences maximum — short enough to fit inside a prompt
- Written as a description, not a story (no verbs like "she walks", just appearance)

Format example:
"7-year-old Japanese girl with straight black hair in two neat buns secured with small cherry blossom clips, warm dark brown eyes, light olive skin and a gentle curious expression. She wears a soft pink floral dress with white Peter Pan collar, white tabi socks and small red Mary Jane shoes."`,
      messages: [{
        role: 'user',
        content: `Generate a visual character description for this child protagonist:\n\n${childInfo}`,
      }],
    });

    const description = (message.content[0] as any).text as string;

    return new Response(JSON.stringify({ description }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
