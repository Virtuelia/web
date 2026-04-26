import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

const CHARACTER_ANIMALS: Record<string, string> = {
  luna: 'the fox', benny: 'the bear', mia: 'the bunny', toby: 'the turtle', zoe: 'the bird',
};

const IMAGE_EXAMPLES = `EXAMPLE IMAGE PROMPTS:
Hana standing under cherry blossom trees with eyes closed and a peaceful smile, a single fat raindrop falling in slow motion toward Hana's nose, pink petals floating all around, extreme close-up, soft warm light, Setting2, Pixar 3D Style

Hana sitting alone on a small wooden bench, head dropped down, shoulders hunched, face shifting from anger to deep sadness, soft pink light filtering through blossoms above, medium shot, Setting2, Pixar 3D Style

Benny sitting gently beside Hana on the bench, not touching, just present, looking at her with full warmth, cherry blossom petals falling softly around them, medium shot, soft warm pink light, Setting2, Pixar 3D Style`;

const VIDEO_EXAMPLES = `EXAMPLE VIDEO PROMPTS:
The kid stands under the cherry blossom trees with eyes closed and a peaceful smile, a single fat raindrop falls in slow motion and hits the kid's nose, the kid's eyes snap open in surprise. Camera holds in extreme close-up on the kid's face. Soft warm light shifts suddenly cooler. Sharp surprised stillness. 4K, 60fps, hyperrealistic. [Audio: gentle petal sounds, then a single loud raindrop, the kid gasps softly "Oh—"]

The bear sits down gently beside the kid on the bench, not touching, just present, looking at the kid with full warmth. Camera holds steady in a medium shot slowly orbiting around the two. Soft warm pink light. Still gentle tender movement. 4K, 60fps, hyperrealistic. [Audio: soft sound of sitting on wooden bench, complete quiet, petals falling softly]`;

export const POST: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as {
      plot: string;
      lead_character: string;
      country_id: string;
      age_range: string;
      child_name?: string;
      child_age?: number;
    };

    const { plot, lead_character, country_id, age_range, child_name, child_age } = body;

    if (!plot || !lead_character || !country_id || !age_range) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const { data: country } = await supabase
      .from('countries')
      .select('name, code')
      .eq('id', country_id)
      .single();

    const runtime = (locals as any).runtime;
    const apiKey = runtime?.env?.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const leadAnimal = CHARACTER_ANIMALS[lead_character] || lead_character;
    const countryName = country?.name || 'Unknown';

    const childHint = [
      child_name ? `Child name: ${child_name}` : `Child name: generate a culturally appropriate name for ${countryName}`,
      child_age ? `Child age: ${child_age}` : `Child age: generate appropriate age for ${age_range} range`,
    ].join('\n');

    // Phase 1: Generate story package as JSON
    const storyPackage = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `You are a creative director for Virtuelia, a children's SEL animated series (ages 4-12, Pixar 3D style).
The five characters: Luna (fox, self-awareness), Benny (bear, self-regulation), Mia (bunny, social skills), Toby (turtle, responsible decisions), Zoe (bird, social awareness).
The lead character for this story is ${lead_character} (${leadAnimal}).

Generate a complete story package as VALID JSON only. No markdown, no explanation, just the JSON object.

JSON structure:
{
  "video": {
    "title": "engaging video title",
    "child_name": "protagonist name",
    "child_age": number,
    "child_personality": "2-3 traits",
    "child_visual_description": "2-sentence visual description for AI image generation — hair, eyes, skin, clothing, culturally accurate for ${countryName}",
    "primary_competency": "${lead_character === 'luna' ? 'self_awareness' : lead_character === 'benny' ? 'self_regulation' : lead_character === 'mia' ? 'social_skills' : lead_character === 'toby' ? 'responsible_decisions' : 'social_awareness'}",
    "primary_theme": "1 short phrase",
    "narrator_opening": "narrator opening line (1 sentence)",
    "narrator_closing": "narrator closing line (1 sentence)"
  },
  "story": {
    "title": "story title",
    "sel_tool_modeled": "specific SEL technique name",
    "key_phrase": "the memorable phrase from this story",
    "situation_description": "2-3 sentences describing the SEL situation",
    "duration_minutes": 5
  },
  "beats": [
    {
      "beat": "hook",
      "content": "scene description — what happens visually",
      "emotion_energy": "emotion/energy level e.g. Peaceful/low",
      "narrator_line": "narrator line or empty string",
      "visual_notes": "specific shot/animation notes for the animator"
    },
    {"beat": "context", ...},
    {"beat": "the_moment", ...},
    {"beat": "the_reaction", ...},
    {"beat": "the_bridge", ...},
    {"beat": "the_shift", ...},
    {"beat": "the_glow", ...}
  ]
}`,
      messages: [{
        role: 'user',
        content: `Story brief: ${plot}
Country/Culture: ${countryName}
${childHint}
Age range: ${age_range}
Lead Virtuelia character: ${lead_character} (${leadAnimal})

Generate the complete story package as JSON.`,
      }],
    });

    const rawJson = (storyPackage.content[0] as any).text as string;
    let parsed: any;
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse story generation response' }), { status: 500 });
    }

    const { video, story, beats } = parsed;
    const childName = video.child_name;
    const childVisualDesc = video.child_visual_description;

    const beatsText = beats.map((b: any, i: number) =>
      `Beat ${i + 1} — ${b.beat.toUpperCase()}:\nContent: ${b.content}\nVisual Notes: ${b.visual_notes}\nEmotion/Energy: ${b.emotion_energy}\nNarrator: ${b.narrator_line}`
    ).join('\n\n');

    // Phase 2: Image + video prompts in parallel
    const [imageMsg, videoMsg] = await Promise.all([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: `You are a creative director for Virtuelia, a children's SEL animated series (ages 4-12, Pixar 3D style).
Characters: Luna (fox), Benny (bear), Mia (bunny), Toby (turtle), Zoe (bird). Lead: ${lead_character}.
Child protagonist: ${childName} — ALWAYS use their real name. Visual: ${childVisualDesc}
FORMAT: [scene with names + exact action], [shot type], [lighting], Setting2, Pixar 3D Style
RULES: Use ${childName}'s name always. ONE specific moment per prompt. Never generic atmosphere. 2-3 shots per beat.
${IMAGE_EXAMPLES}
Output ONLY 20 prompts separated by blank lines. No numbering.`,
        messages: [{ role: 'user', content: `Story: "${story.title}"\nChild: ${childName}\nLead: ${lead_character}\n\n${beatsText}\n\nGenerate 20 image prompts for nanobanana.` }],
      }),
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: `You are a creative director for Virtuelia, a children's SEL animated series (ages 4-12).
Characters by animal type: luna="the fox"(Yip!), benny="the bear"(Grrrr!), mia="the bunny"(Thump thump!), toby="the turtle", zoe="the bird"(Tweet tweet!). Child="the kid".
Lead: ${leadAnimal}.
FORMAT: [scene]. Camera [movement]. [Lighting]. [Movement quality]. 4K, 60fps, hyperrealistic. [Audio: ...]
RULES: ONE specific cinematic moment per prompt. Specific camera movement. Detailed audio.
${VIDEO_EXAMPLES}
Output ONLY 20 prompts separated by blank lines. No numbering.`,
        messages: [{ role: 'user', content: `Story: "${story.title}"\nChild: ${childName}\nLead: ${leadAnimal}\n\n${beatsText}\n\nGenerate 20 video prompts for Grok.` }],
      }),
    ]);

    const imagePrompts = (imageMsg.content[0] as any).text.split('\n\n').map((p: string) => p.trim()).filter(Boolean);
    const videoPrompts = (videoMsg.content[0] as any).text.split('\n\n').map((p: string) => p.trim()).filter(Boolean);

    return new Response(JSON.stringify({
      video: { ...video, country_id, age_range },
      story: { ...story, lead_character, primary_competency: video.primary_competency },
      beats,
      image_prompts: imagePrompts,
      video_prompts: videoPrompts,
    }), { status: 200 });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
