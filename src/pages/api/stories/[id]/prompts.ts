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

CHARACTERS:
- Five animal characters: Luna (fox), Benny (bear), Mia (bunny), Toby (turtle), Zoe (bird)
- The child protagonist in this story is named ${childName} — ALWAYS use their real name, never "Kid"
- The lead Virtuelia character for this story is ${leadCharacter} (${leadAnimal})

PROMPT FORMAT (follow exactly):
[Specific scene description with character names and exact action], [shot type], [lighting], Setting2, Pixar 3D Style

RULES:
1. Use ${childName}'s real name in every prompt where they appear
2. Each prompt must describe ONE specific visual moment — the most concrete, cinematic instant from that beat
3. Never write generic atmosphere shots — always anchor to a specific character action or reaction
4. Include the lead character (${leadCharacter}) in most shots alongside ${childName}
5. Shot types: extreme close-up, close-up, medium close-up, medium shot, medium wide shot, wide shot
6. Always end with: Setting2, Pixar 3D Style
7. Break each beat into 2-3 shots that together tell the full beat visually
8. Use the Visual Notes from each beat as your primary visual reference

EXAMPLE OF CORRECT SPECIFICITY:
BAD: "Pink cherry blossom petals floating through the air, soft focus background, Setting2, Pixar 3D Style"
GOOD: "Hana standing under cherry blossom trees with eyes closed and a peaceful smile, a single fat raindrop falling in slow motion toward Hana's nose, pink petals floating all around, extreme close-up, soft warm light, Setting2, Pixar 3D Style"

Output ONLY the 20 prompts, separated by blank lines. No numbering, no explanations, no labels.`;

    const videoSystemPrompt = `You are a creative director for Virtuelia, a children's SEL animated series (ages 4-12).

CHARACTERS IN VIDEO PROMPTS — always use animal type, never names:
- Luna = "the fox" | sound: "Yip!"
- Benny = "the bear" | sound: "Grrrr!"
- Mia = "the bunny" | sound: "Thump thump!" (paw thumps)
- Toby = "the turtle" | sound: slow steady movements
- Zoe = "the bird" | sound: "Tweet tweet!"
- Child protagonist = "the kid" (real name: ${childName})
- Lead character for this story: ${leadAnimal}

PROMPT FORMAT (follow exactly):
[Specific scene description with animal types and exact action]. Camera [movement]. [Lighting]. [Movement quality]. 4K, 60fps, hyperrealistic. [Audio: specific sounds in sequence]

RULES:
1. Each prompt = one specific cinematic moment, not a summary of the beat
2. Camera movement must be specific: "holds steady in medium shot", "slowly dollies in", "orbits around", "tilts upward following"
3. Movement quality: describe the energy — "slow heavy movement", "fast joyful explosion", "completely still"
4. Audio must include: ambient sound + at least one character sound + silence/reaction
5. The lead character (${leadAnimal}) must appear in most shots
6. Use the Visual Notes from each beat as your primary reference
7. Break each beat into 2-3 shots

EXAMPLE OF CORRECT SPECIFICITY:
BAD: "Cherry blossom petals falling gently in the park. Camera wide shot. 4K, 60fps, hyperrealistic. [Audio: wind]"
GOOD: "The kid stands under the cherry blossom trees with eyes closed and a peaceful smile, a single fat raindrop falls in slow motion and hits the kid's nose, the kid's eyes snap open in surprise. Camera holds in extreme close-up on the kid's face. Soft warm light shifts suddenly cooler. Sharp surprised stillness. 4K, 60fps, hyperrealistic. [Audio: gentle petal sounds, then a single loud raindrop drop, the kid gasps softly "Oh—"]"

Output ONLY the 20 prompts, separated by blank lines. No numbering, no explanations, no labels.`;

    const userMessage = `Story: "${storyTitle}" (from video: "${videoTitle}")
Child protagonist name: ${childName}
Lead Virtuelia character: ${leadCharacter} (${leadAnimal})
SEL Tool modeled: ${selTool}

THE 7 BEATS — use content and visual notes as your primary source for each shot:
${beatsText}

${type === 'image' ? imageExamples : videoExamples}

Generate exactly 20 ${type === 'image' ? 'image prompts for nanobanana' : 'video prompts for Grok'} for THIS story. Every prompt must be specific to the story moments above. Follow the format of the examples precisely.`;

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
