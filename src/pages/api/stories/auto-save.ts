import type { APIRoute } from 'astro';
import { slugify } from '@/lib/helpers';

export const POST: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as any;
    const { video, story, beats, image_prompts, video_prompts } = body;

    // Create video
    const { data: newVideo, error: videoError } = await supabase
      .from('videos')
      .insert({
        title: video.title,
        slug: slugify(video.title),
        content_type: 'youtube_video',
        age_range: video.age_range,
        country_id: video.country_id || null,
        child_name: video.child_name,
        child_age: video.child_age || null,
        child_personality: video.child_personality || null,
        child_visual_description: video.child_visual_description || null,
        primary_competency: video.primary_competency || null,
        primary_theme: video.primary_theme || null,
        narrator_opening: video.narrator_opening || null,
        narrator_closing: video.narrator_closing || null,
        planned_story_count: 1,
        status: 'concept',
        created_by: locals.user.id,
      })
      .select()
      .single();

    if (videoError || !newVideo) {
      return new Response(JSON.stringify({ error: videoError?.message || 'Failed to create video' }), { status: 400 });
    }

    // Create story
    const { data: newStory, error: storyError } = await supabase
      .from('stories')
      .insert({
        video_id: newVideo.id,
        story_number: 1,
        title: story.title,
        lead_character: story.lead_character,
        primary_competency: story.primary_competency,
        sel_tool_modeled: story.sel_tool_modeled || null,
        key_phrase: story.key_phrase || null,
        situation_description: story.situation_description || null,
        duration_minutes: story.duration_minutes || 5,
        status: 'draft',
        image_prompts: image_prompts || null,
        video_prompts: video_prompts || null,
        prompts_generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (storyError || !newStory) {
      return new Response(JSON.stringify({ error: storyError?.message || 'Failed to create story' }), { status: 400 });
    }

    // Create beats
    const beatOrder: Record<string, number> = {
      hook: 1, context: 2, the_moment: 3, the_reaction: 4,
      the_bridge: 5, the_shift: 6, the_glow: 7,
    };

    const beatRecords = beats.map((b: any) => ({
      story_id: newStory.id,
      beat: b.beat,
      beat_order: beatOrder[b.beat] || 0,
      content: b.content || null,
      emotion_energy: b.emotion_energy || null,
      narrator_line: b.narrator_line || null,
      visual_notes: b.visual_notes || null,
      duration_seconds: b.duration_seconds || null,
    }));

    const { error: beatsError } = await supabase
      .from('story_beats')
      .insert(beatRecords);

    if (beatsError) {
      return new Response(JSON.stringify({ error: beatsError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ video_id: newVideo.id, story_id: newStory.id }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
