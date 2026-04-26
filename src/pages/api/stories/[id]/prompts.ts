import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const POST: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id: storyId } = params;
    const body = await request.json() as { type: 'image' | 'video' };
    const { type } = body;

    if (!type || !['image', 'video'].includes(type)) {
      return new Response(JSON.stringify({ error: 'type must be "image" or "video"' }), { status: 400 });
    }

    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select(`
        *,
        beats: story_beats(*),
        videos (id, title, child_name, child_age, primary_competency, primary_theme, cultural_notes, country:countries(name))
      `)
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return new Response(JSON.stringify({ error: 'Story not found' }), { status: 404 });
    }

    const beatOrder = ['hook', 'context', 'the_moment', 'the_reaction', 'the_bridge', 'the_shift', 'the_glow'];
    const beats = beatOrder.map(bt => (story.beats || []).find((b: any) => b.beat === bt)).filter(Boolean);

    const characterSounds: Record<string, string> = {
      luna: 'the fox lets out a warm "Yip!"',
      benny: 'the bear lets out a deep "Grrrr!"',
      mia: 'the bunny thumps excitedly "Thump thump!"',
      toby: 'the turtle speaks slowly and steadily',
      zoe: 'the bird trills "Tweet tweet!"',
    };

    const characterAnimals: Record<string, string> = {
      luna: 'the fox',
      benny: 'the bear',
      mia: 'the bunny',
      toby: 'the turtle',
      zoe: 'the bird',
    };

    const leadCharacter = story.lead_character;
    const leadAnimal = characterAnimals[leadCharacter] || leadCharacter;
    const leadSound = characterSounds[leadCharacter] || '';
    const childName = story.videos?.child_name || 'Kid';
    const selTool = story.sel_tool_modeled || '';
    const storyTitle = story.title || 'Story';
    const videoTitle = story.videos?.title || '';

    const beatsText = beats.map((b: any, i: number) => {
      return `Beat ${i + 1} — ${b.beat.toUpperCase()}:
Content: ${b.content || '(empty)'}
Visual Notes: ${b.visual_notes || '(none)'}
Emotion/Energy: ${b.emotion_energy || '(none)'}
Narrator: ${b.narrator_line || '(none)'}`;
    }).join('\n\n');

    const imageExamples = `EXAMPLE IMAGE PROMPTS (nanobanana format):
Car parked at the entrance of a beautiful Japanese park with cherry blossom trees in full bloom, Luna, Benny, Mia, Toby and Zoe jumping out of Car with excited happy faces, pink petals floating in the air, medium wide shot, Setting2, Pixar 3D Style

Luna, Benny, Mia, Toby and Zoe walking toward Kid who is sitting alone under a cherry blossom tree, all the animals smiling warmly, Kid looking up at them with a surprised and happy expression, medium wide shot, warm soft pink light, Setting2, Pixar 3D Style

Kid standing alone with fists clenched tightly at sides, eyebrows furrowed hard, jaw tight, whole body stiff with anger, cherry blossom petals falling softly around Kid, medium shot, Setting2, Pixar 3D Style

Mia sitting gently beside Kid on the small wooden bench under the cherry blossom tree, placing one soft paw carefully on Kid's shoulder, looking at Kid with warm caring eyes, medium shot, soft pink warm light, Setting2, Pixar 3D Style`;

    const videoExamples = `EXAMPLE VIDEO PROMPTS (Grok format):
A bright yellow adventure van parks at the entrance of a Japanese park, the fox, the bear, the bunny, the turtle and the bird jump out one by one with excited happy faces, pink cherry blossom petals floating gently in the air around them. Camera holds steady in a medium wide shot. Warm soft pink light. Energetic joyful movement. 4K, 60fps, hyperrealistic. [Audio: engine stopping, van doors opening, the bear lets out a happy "Grrrr!", the bunny thumps excitedly "Thump thump!", the bird trills "Tweet tweet!", footsteps on stone path]

The bunny sits down gently beside the kid on the bench, slowly placing one soft paw on the kid's shoulder, looking at the kid with warm caring eyes, soft pink light and cherry blossom petals falling around them. Camera holds steady in a medium shot slowly orbiting around the two. Soft warm pink light. Still gentle tender movement. 4K, 60fps, hyperrealistic. [Audio: soft sound of sitting on the wooden bench, gentle paw on shoulder, complete quiet, petals falling softly]`;

    const imageSystemPrompt = `You are a creative director for Virtuelia, a children's SEL animated series (ages 4-12, Pixar 3D style).
The five animal characters are: Luna (fox), Benny (bear), Mia (bunny), Toby (turtle), Zoe (bird).
Each character corresponds to a SEL competency. The lead character for this story is ${leadAnimal} (${leadCharacter}).
The child protagonist is always referred to as "Kid" in prompts.
Setting2 is a saved environment preset in nanobanana. Always end with "Setting2, Pixar 3D Style".
Generate exactly 20 image prompts for the story below, following the format exactly.
Break each beat into 2-3 shots as needed. Focus on visual storytelling.
Output ONLY the 20 prompts, one per line, with a blank line between each. No numbering, no explanations.`;

    const videoSystemPrompt = `You are a creative director for Virtuelia, a children's SEL animated series (ages 4-12).
The five animal characters are referred to by animal type in video prompts: Luna = "the fox", Benny = "the bear", Mia = "the bunny", Toby = "the turtle", Zoe = "the bird".
The child protagonist is always referred to as "the kid".
Character sounds: fox = "Yip!", bear = "Grrrr!", bunny = "Thump thump!" (paw thumps), bird = "Tweet tweet!".
The lead character for this story is ${leadAnimal}.
Generate exactly 20 video prompts for the story below, following the format exactly.
Each prompt ends with: 4K, 60fps, hyperrealistic. [Audio: ...]
Output ONLY the 20 prompts, one per line, with a blank line between each. No numbering, no explanations.`;

    const userMessage = `Story: "${storyTitle}" (from video: "${videoTitle}")
Child protagonist: ${childName}
Lead Virtuelia character: ${leadCharacter} (${leadAnimal})
SEL Tool modeled: ${selTool}

${beatsText}

${type === 'image' ? imageExamples : videoExamples}

Generate exactly 20 ${type === 'image' ? 'image prompts for nanobanana' : 'video prompts for Grok'} for this story. Follow the format of the examples precisely.`;

    const runtime = (locals as any).runtime;
    const apiKey = runtime?.env?.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: type === 'image' ? imageSystemPrompt : videoSystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = (message.content[0] as any).text as string;
    const prompts = text.split('\n\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);

    return new Response(JSON.stringify({ prompts, type }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
