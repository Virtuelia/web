import type { VideoStatus, StoryStatus, SelCompetency, CharacterName, BeatType } from './database.types';

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  concept: 'Concept',
  planning: 'Planning',
  scripting: 'Scripting',
  sel_review: 'SEL Review',
  storyboard: 'Storyboard',
  production: 'Production',
  editing: 'Editing',
  final_review: 'Final Review',
  published: 'Published',
};

export const VIDEO_STATUS_COLORS: Record<VideoStatus, string> = {
  concept: 'bg-purple-100 text-purple-800',
  planning: 'bg-sky-100 text-sky-800',
  scripting: 'bg-blue-100 text-blue-800',
  sel_review: 'bg-pink-100 text-pink-800',
  storyboard: 'bg-yellow-100 text-yellow-800',
  production: 'bg-orange-100 text-orange-800',
  editing: 'bg-green-100 text-green-800',
  final_review: 'bg-teal-100 text-teal-800',
  published: 'bg-emerald-100 text-emerald-800',
};

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  draft: 'Draft',
  script_ready: 'Script Ready',
  sel_pending: 'SEL Pending',
  sel_approved: 'SEL Approved',
  sel_revision: 'SEL Revision Needed',
  storyboard: 'Storyboard',
  animation: 'Animation',
  voiceover: 'Voiceover',
  complete: 'Complete',
};

export const STORY_STATUS_COLORS: Record<StoryStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  script_ready: 'bg-blue-100 text-blue-800',
  sel_pending: 'bg-yellow-100 text-yellow-800',
  sel_approved: 'bg-green-100 text-green-800',
  sel_revision: 'bg-red-100 text-red-800',
  storyboard: 'bg-orange-100 text-orange-800',
  animation: 'bg-purple-100 text-purple-800',
  voiceover: 'bg-pink-100 text-pink-800',
  complete: 'bg-emerald-100 text-emerald-800',
};

export const COMPETENCY_LABELS: Record<SelCompetency, string> = {
  self_awareness: 'Self-Awareness',
  self_regulation: 'Self-Regulation',
  social_skills: 'Social Skills',
  responsible_decisions: 'Responsible Decisions',
  social_awareness: 'Social Awareness',
};

export const COMPETENCY_COLORS: Record<SelCompetency, string> = {
  self_awareness: '#E8751A',
  self_regulation: '#8B5E3C',
  social_skills: '#E91E8C',
  responsible_decisions: '#2D8B57',
  social_awareness: '#D4A017',
};

export const CHARACTER_LABELS: Record<CharacterName, string> = {
  luna: 'Luna the Fox',
  benny: 'Benny the Bear',
  mia: 'Mia the Bunny',
  toby: 'Toby the Turtle',
  zoe: 'Zoe the Bird',
};

export const CHARACTER_COMPETENCY: Record<CharacterName, SelCompetency> = {
  luna: 'self_awareness',
  benny: 'self_regulation',
  mia: 'social_skills',
  toby: 'responsible_decisions',
  zoe: 'social_awareness',
};

export const BEAT_LABELS: Record<BeatType, string> = {
  hook: '1. Hook',
  context: '2. Context',
  the_moment: '3. The Moment',
  the_reaction: '4. The Reaction',
  the_bridge: '5. The Bridge',
  the_shift: '6. The Shift',
  the_glow: '7. The Glow',
};

export const BEAT_COLORS: Record<BeatType, string> = {
  hook: 'bg-orange-50 border-orange-300',
  context: 'bg-yellow-50 border-yellow-300',
  the_moment: 'bg-green-50 border-green-300',
  the_reaction: 'bg-blue-50 border-blue-300',
  the_bridge: 'bg-purple-50 border-purple-300',
  the_shift: 'bg-pink-50 border-pink-300',
  the_glow: 'bg-teal-50 border-teal-300',
};

export const BEAT_DESCRIPTIONS: Record<BeatType, string> = {
  hook: 'Show, don\'t tell. A single powerful image or sound.',
  context: 'Narrator: 2 sentences max. Who, where, what.',
  the_moment: 'The SEL situation happens naturally. Must feel real.',
  the_reaction: 'The child reacts authentically. Never judge.',
  the_bridge: 'The lead character connects. Relate, don\'t teach.',
  the_shift: 'The child tries the SEL tool. Imperfect is perfect.',
  the_glow: 'Celebration. Earned, not generic.',
};

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `${base}-${Date.now()}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getProgressPercentage(stories: Array<{ status: string }>): number {
  if (!stories.length) return 0;
  const completed = stories.filter(s => s.status === 'complete').length;
  return Math.round((completed / stories.length) * 100);
}

export function getSelValidationProgress(stories: Array<{ sel_approved: boolean }>): { approved: number; total: number; percentage: number } {
  const total = stories.length;
  const approved = stories.filter(s => s.sel_approved).length;
  return { approved, total, percentage: total ? Math.round((approved / total) * 100) : 0 };
}
