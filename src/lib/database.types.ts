export type UserRole = 'admin' | 'creator' | 'sel_reviewer' | 'media_producer' | 'viewer';
export type VideoStatus = 'concept' | 'planning' | 'scripting' | 'sel_review' | 'storyboard' | 'production' | 'editing' | 'final_review' | 'published';
export type StoryStatus = 'draft' | 'script_ready' | 'sel_pending' | 'sel_approved' | 'sel_revision' | 'storyboard' | 'animation' | 'voiceover' | 'complete';
export type SelCompetency = 'self_awareness' | 'self_regulation' | 'social_skills' | 'responsible_decisions' | 'social_awareness';
export type CharacterName = 'luna' | 'benny' | 'mia' | 'toby' | 'zoe';
export type BeatType = 'hook' | 'context' | 'the_moment' | 'the_reaction' | 'the_bridge' | 'the_shift' | 'the_glow';
export type ContentType = 'youtube_video' | 'youtube_short' | 'web_article' | 'web_lesson' | 'web_activity' | 'social_post';
export type AgeGroup = '4-6' | '5-8' | '7-10' | '9-12' | '4-12';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  region: string | null;
  is_fantasy: boolean;
  cultural_notes: string | null;
  visual_palette: Record<string, string> | null;
  landmarks: string[] | null;
  common_names: Record<string, string[]> | null;
  research_status: string;
  created_at: string;
  updated_at: string;
}

export interface SelTrait {
  id: string;
  competency: SelCompetency;
  category: string;
  name: string;
  description: string | null;
  lead_character: CharacterName;
  age_range: AgeGroup;
  created_at: string;
}

export interface Character {
  id: string;
  name: CharacterName;
  display_name: string;
  animal: string;
  competency: SelCompetency;
  personality: string | null;
  sel_function: string | null;
  signature_sounds: string | null;
  signature_phrases: string[] | null;
  color_primary: string | null;
  color_secondary: string | null;
  model_sheet_url: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  content_type: ContentType;
  country_id: string | null;
  child_name: string | null;
  child_age: number | null;
  child_personality: string | null;
  child_visual_description: string | null;
  child_reference_image_url: string | null;
  primary_competency: SelCompetency | null;
  primary_theme: string | null;
  age_range: AgeGroup;
  status: VideoStatus;
  target_duration_minutes: number | null;
  planned_story_count: number;
  narrator_opening: string | null;
  narrator_closing: string | null;
  narrator_voice_direction: string | null;
  cultural_research_status: string;
  cultural_notes: string | null;
  cultural_consultant: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
  youtube_id: string | null;
  notes_alin: string | null;
  notes_david: string | null;
  notes_emi: string | null;
  created_by: string | null;
  assigned_to: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  country?: Country;
  stories?: Story[];
}

export interface Story {
  id: string;
  video_id: string;
  story_number: number;
  title: string | null;
  primary_competency: SelCompetency;
  primary_trait_id: string | null;
  lead_character: CharacterName;
  sel_tool_modeled: string | null;
  key_phrase: string | null;
  situation_description: string | null;
  duration_minutes: number;
  status: StoryStatus;
  sel_emotion_accurate: boolean | null;
  sel_tool_evidence_based: boolean | null;
  sel_resolution_realistic: boolean | null;
  sel_content_safe: boolean | null;
  sel_message_clear: boolean | null;
  sel_cultural_check: boolean | null;
  sel_approved: boolean;
  sel_reviewer_id: string | null;
  sel_review_notes: string | null;
  sel_reviewed_at: string | null;
  storyboard_url: string | null;
  animation_status: string | null;
  voiceover_status: string | null;
  media_notes: string | null;
  media_producer_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  beats?: StoryBeat[];
  trait?: SelTrait;
  character_moments?: CharacterMoment[];
}

export interface StoryBeat {
  id: string;
  story_id: string;
  beat: BeatType;
  beat_order: number;
  content: string | null;
  emotion_energy: string | null;
  narrator_line: string | null;
  visual_notes: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterMoment {
  id: string;
  story_id: string;
  character_name: CharacterName;
  moment_description: string;
  is_lead: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any> | null;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Profile;
}

export interface WebPage {
  id: string;
  title: string;
  slug: string;
  content_type: ContentType;
  body: string | null;
  related_video_id: string | null;
  related_trait_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  status: string;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  storage_path: string;
  entity_type: string | null;
  entity_id: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      countries: { Row: Country; Insert: Partial<Country>; Update: Partial<Country> };
      sel_traits: { Row: SelTrait; Insert: Partial<SelTrait>; Update: Partial<SelTrait> };
      characters: { Row: Character; Insert: Partial<Character>; Update: Partial<Character> };
      videos: { Row: Video; Insert: Partial<Video>; Update: Partial<Video> };
      stories: { Row: Story; Insert: Partial<Story>; Update: Partial<Story> };
      story_beats: { Row: StoryBeat; Insert: Partial<StoryBeat>; Update: Partial<StoryBeat> };
      character_moments: { Row: CharacterMoment; Insert: Partial<CharacterMoment>; Update: Partial<CharacterMoment> };
      activity_log: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> };
      comments: { Row: Comment; Insert: Partial<Comment>; Update: Partial<Comment> };
      web_pages: { Row: WebPage; Insert: Partial<WebPage>; Update: Partial<WebPage> };
      media_assets: { Row: MediaAsset; Insert: Partial<MediaAsset>; Update: Partial<MediaAsset> };
    };
  };
}
