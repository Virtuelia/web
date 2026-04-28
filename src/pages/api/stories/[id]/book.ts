import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const POST: APIRoute = async ({ locals, params }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id: storyId } = params;

    const { data: story, error } = await supabase
      .from('stories')
      .select(`
        *,
        beats: story_beats(*),
        videos (title, child_name, child_age, child_personality, child_visual_description, country:countries(name))
      `)
      .eq('id', storyId)
      .single();

    if (error || !story) {
      return new Response(JSON.stringify({ error: 'Story not found' }), { status: 404 });
    }

    const runtime = (locals as any).runtime;
    const apiKey = runtime?.env?.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
    }

    const beatOrder = ['hook', 'context', 'the_moment', 'the_reaction', 'the_bridge', 'the_shift', 'the_glow'];
    const beats = beatOrder
      .map(bt => (story.beats || []).find((b: any) => b.beat === bt))
      .filter(Boolean);

    const beatsText = beats.map((b: any) => b.content).filter(Boolean).join('\n\n');
    const childName = story.videos?.child_name || 'the child';
    const childAge = story.videos?.child_age;
    const country = story.videos?.country?.name || '';
    const selTool = story.sel_tool_modeled || '';
    const characterNames: Record<string, string> = {
      luna: 'Luna the Fox', benny: 'Benny the Bear',
      mia: 'Mia the Bunny', toby: 'Toby the Turtle', zoe: 'Zoe the Bird',
    };
    const leadCharacterName = characterNames[story.lead_character] || story.lead_character;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are a children's book author writing for the Virtuelia series — a collection of illustrated stories that teach Social-Emotional Learning (SEL) to children ages 4-12.

Your writing style:
- Warm, lyrical, and age-appropriate prose
- Short paragraphs (2-4 sentences each)
- Rich sensory details that work alongside illustrations
- Authentic emotions — never preachy, never sugar-coated
- Dialogue that sounds natural for children
- The SEL lesson emerges through the story, never stated directly
- Ending that feels earned, not generic

Structure: write a continuous narrative with no chapter titles, no beat labels, no headers. Just flowing prose from beginning to end, ready to print in a book.

Length: 400-600 words.`,
      messages: [{
        role: 'user',
        content: `Write the children's book version of this story.

Title: "${story.title}"
Child protagonist: ${childName}${childAge ? `, age ${childAge}` : ''}${country ? `, from ${country}` : ''}
Lead Virtuelia character: ${leadCharacterName}
SEL tool shown: ${selTool}

Story beats (the raw material — rewrite as polished prose):
${beatsText}

Write the full story as continuous children's book prose.`,
      }],
    });

    const bookText = (message.content[0] as any).text as string;

    await supabase
      .from('stories')
      .update({ book_text: bookText })
      .eq('id', storyId);

    return new Response(JSON.stringify({ book_text: bookText }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
