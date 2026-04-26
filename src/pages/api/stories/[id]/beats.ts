import type { APIRoute } from 'astro';
import type { BeatType } from '@/lib/database.types';

interface BeatInput {
  beat: BeatType;
  content?: string | null;
  emotion_energy?: string | null;
  narrator_line?: string | null;
  visual_notes?: string | null;
  duration_seconds?: number | null;
}

export const PUT: APIRoute = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id: storyId } = params;
    const beats = await request.json() as BeatInput[];

    if (!Array.isArray(beats) || beats.length !== 7) {
      return new Response(
        JSON.stringify({ error: 'Expected an array of exactly 7 beats' }),
        { status: 400 }
      );
    }

    // Map beat types to their order
    const beatOrder: Record<BeatType, number> = {
      hook: 1,
      context: 2,
      the_moment: 3,
      the_reaction: 4,
      the_bridge: 5,
      the_shift: 6,
      the_glow: 7,
    };

    const beatRecords = beats.map((beat) => ({
      story_id: storyId,
      beat: beat.beat,
      beat_order: beatOrder[beat.beat] || 0,
      content: beat.content || null,
      emotion_energy: beat.emotion_energy || null,
      narrator_line: beat.narrator_line || null,
      visual_notes: beat.visual_notes || null,
      duration_seconds: beat.duration_seconds || null,
    }));

    // Delete existing beats for this story
    const { error: deleteError } = await supabase
      .from('story_beats')
      .delete()
      .eq('story_id', storyId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 400 });
    }

    // Insert new beats
    const { data, error } = await supabase
      .from('story_beats')
      .insert(beatRecords)
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
