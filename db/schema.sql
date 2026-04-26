-- =============================================
-- VIRTUELIA DASHBOARD — COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM (
  'admin',        -- Full access (Alin)
  'creator',      -- Can create/edit content (writers, animators)
  'sel_reviewer',  -- Can review/validate SEL (Emi)
  'media_producer', -- Can manage media/design (David)
  'viewer'         -- Read-only (partners, consultants)
);

CREATE TYPE video_status AS ENUM (
  'concept',
  'planning',
  'scripting',
  'sel_review',
  'storyboard',
  'production',
  'editing',
  'final_review',
  'published'
);

CREATE TYPE story_status AS ENUM (
  'draft',
  'script_ready',
  'sel_pending',
  'sel_approved',
  'sel_revision',
  'storyboard',
  'animation',
  'voiceover',
  'complete'
);

CREATE TYPE sel_competency AS ENUM (
  'self_awareness',
  'self_regulation',
  'social_skills',
  'responsible_decisions',
  'social_awareness'
);

CREATE TYPE character_name AS ENUM (
  'luna',
  'benny',
  'mia',
  'toby',
  'zoe'
);

CREATE TYPE beat_type AS ENUM (
  'hook',
  'context',
  'the_moment',
  'the_reaction',
  'the_bridge',
  'the_shift',
  'the_glow'
);

CREATE TYPE content_type AS ENUM (
  'youtube_video',
  'youtube_short',
  'web_article',
  'web_lesson',
  'web_activity',
  'social_post'
);

CREATE TYPE age_group AS ENUM (
  '4-6',
  '5-8',
  '7-10',
  '9-12',
  '4-12'
);

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- COUNTRIES
-- =============================================

CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- ISO 3166-1 alpha-2
  region TEXT, -- e.g. 'East Asia', 'South America'
  is_fantasy BOOLEAN DEFAULT FALSE, -- for fantasy world episodes
  cultural_notes TEXT, -- research notes
  visual_palette JSONB, -- e.g. {"primary": "#FF0000", "secondary": "#00FF00", "ambient": "warm"}
  landmarks TEXT[], -- notable landmarks for thumbnails
  common_names JSONB, -- e.g. {"male": ["Hiro", "Kenji"], "female": ["Hana", "Yuki"]}
  research_status TEXT DEFAULT 'pending', -- pending, in_progress, complete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SEL TRAITS (from the Traits Library)
-- =============================================

CREATE TABLE sel_traits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competency sel_competency NOT NULL,
  category TEXT NOT NULL, -- sub-category e.g. 'Emotional awareness'
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  lead_character character_name NOT NULL,
  age_range age_group DEFAULT '4-12',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHARACTERS (the 5 animals + van)
-- =============================================

CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name character_name NOT NULL UNIQUE,
  display_name TEXT NOT NULL, -- 'Luna the Fox'
  animal TEXT NOT NULL,
  competency sel_competency NOT NULL,
  personality TEXT,
  sel_function TEXT,
  signature_sounds TEXT,
  signature_phrases TEXT[],
  color_primary TEXT, -- hex
  color_secondary TEXT,
  model_sheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VIDEOS (a full YouTube video)
-- =============================================

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type content_type DEFAULT 'youtube_video',
  country_id UUID REFERENCES countries(id),

  -- Protagonist
  child_name TEXT,
  child_age INTEGER,
  child_personality TEXT,
  child_visual_description TEXT,
  child_reference_image_url TEXT,

  -- SEL
  primary_competency sel_competency,
  primary_theme TEXT,
  age_range age_group DEFAULT '4-12',

  -- Production
  status video_status DEFAULT 'concept',
  target_duration_minutes INTEGER,
  planned_story_count INTEGER DEFAULT 3,

  -- Narrator
  narrator_opening TEXT,
  narrator_closing TEXT,
  narrator_voice_direction TEXT,

  -- Cultural
  cultural_research_status TEXT DEFAULT 'pending',
  cultural_notes TEXT,
  cultural_consultant TEXT,

  -- Media
  thumbnail_url TEXT,
  youtube_url TEXT,
  youtube_id TEXT,

  -- Team notes
  notes_alin TEXT,
  notes_david TEXT,
  notes_emi TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STORIES (individual mini-stories within a video)
-- =============================================

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  story_number INTEGER NOT NULL, -- order within video (1, 2, 3...)
  title TEXT,

  -- SEL mapping
  primary_competency sel_competency NOT NULL,
  primary_trait_id UUID REFERENCES sel_traits(id),
  lead_character character_name NOT NULL,
  sel_tool_modeled TEXT, -- e.g. 'Naming the real emotion'
  key_phrase TEXT, -- the line a child remembers

  -- Story content
  situation_description TEXT,
  duration_minutes INTEGER DEFAULT 4,

  -- Production status
  status story_status DEFAULT 'draft',

  -- SEL validation (Emi)
  sel_emotion_accurate BOOLEAN,
  sel_tool_evidence_based BOOLEAN,
  sel_resolution_realistic BOOLEAN,
  sel_content_safe BOOLEAN,
  sel_message_clear BOOLEAN,
  sel_cultural_check BOOLEAN,
  sel_approved BOOLEAN DEFAULT FALSE,
  sel_reviewer_id UUID REFERENCES profiles(id),
  sel_review_notes TEXT,
  sel_reviewed_at TIMESTAMPTZ,

  -- Media production (David)
  storyboard_url TEXT,
  animation_status TEXT,
  voiceover_status TEXT,
  media_notes TEXT,
  media_producer_id UUID REFERENCES profiles(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(video_id, story_number)
);

-- =============================================
-- STORY BEATS (the 7 beats per story)
-- =============================================

CREATE TABLE story_beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  beat beat_type NOT NULL,
  beat_order INTEGER NOT NULL, -- 1-7
  content TEXT, -- what happens
  emotion_energy TEXT, -- e.g. 'Rising anxiety'
  narrator_line TEXT,
  visual_notes TEXT, -- notes for David
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(story_id, beat)
);

-- =============================================
-- CHARACTER MOMENTS (supporting character actions per story)
-- =============================================

CREATE TABLE character_moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  character_name character_name NOT NULL,
  moment_description TEXT NOT NULL,
  is_lead BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(story_id, character_name)
);

-- =============================================
-- ACTIVITY LOG (track all changes)
-- =============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- e.g. 'created_video', 'approved_sel', 'updated_story'
  entity_type TEXT NOT NULL, -- 'video', 'story', 'beat', etc.
  entity_id UUID NOT NULL,
  details JSONB, -- any additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMENTS / DISCUSSIONS
-- =============================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL, -- 'video', 'story', 'beat'
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id), -- for threaded replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- WEB CONTENT (future website content)
-- =============================================

CREATE TABLE web_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type content_type DEFAULT 'web_article',
  body TEXT, -- markdown or HTML
  related_video_id UUID REFERENCES videos(id),
  related_trait_id UUID REFERENCES sel_traits(id),
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  status TEXT DEFAULT 'draft', -- draft, review, published
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEDIA ASSETS
-- =============================================

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- image, video, audio, document
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase storage path
  entity_type TEXT, -- what this is attached to
  entity_id UUID,
  tags TEXT[],
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_country ON videos(country_id);
CREATE INDEX idx_videos_competency ON videos(primary_competency);
CREATE INDEX idx_stories_video ON stories(video_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_competency ON stories(primary_competency);
CREATE INDEX idx_story_beats_story ON story_beats(story_id);
CREATE INDEX idx_sel_traits_competency ON sel_traits(competency);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_media_assets_entity ON media_assets(entity_type, entity_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sel_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Most tables: authenticated users can read, admins/creators can write
CREATE POLICY "Authenticated read" ON countries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/creator write countries" ON countries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);

CREATE POLICY "Authenticated read" ON sel_traits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write traits" ON sel_traits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated read" ON characters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write characters" ON characters FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated read" ON videos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/creator write videos" ON videos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator', 'media_producer'))
);

CREATE POLICY "Authenticated read" ON stories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/creator/sel write stories" ON stories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator', 'sel_reviewer', 'media_producer'))
);

CREATE POLICY "Authenticated read" ON story_beats FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/creator write beats" ON story_beats FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);

CREATE POLICY "Authenticated read" ON character_moments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/creator write moments" ON character_moments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);

CREATE POLICY "Authenticated read" ON activity_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert log" ON activity_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read" ON comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Own comments update" ON comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated read" ON web_pages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/creator write pages" ON web_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'creator'))
);

CREATE POLICY "Authenticated read" ON media_assets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated upload" ON media_assets FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_story_beats_updated_at BEFORE UPDATE ON story_beats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_web_pages_updated_at BEFORE UPDATE ON web_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED: Characters
-- =============================================

INSERT INTO characters (name, display_name, animal, competency, personality, sel_function, signature_sounds, signature_phrases, color_primary, color_secondary) VALUES
('luna', 'Luna the Fox', 'Fox', 'self_awareness', 'Smart, curious, natural leader. Thinks before acting. Quiet confidence.', 'Names emotions. Helps children identify what they are feeling.', 'Sharp "Yip!", soft "Hmm...", warm "Yip..."', ARRAY['I feel ___ because ___', 'I think what you''re feeling is...'], '#E8751A', '#5B8DB8'),
('benny', 'Benny the Bear', 'Bear', 'self_regulation', 'Gentle, emotional, full of love. Feels everything deeply and intensely.', 'Models emotion management. Practices calming tools in real-time.', 'Deep "Grrrr...", loud "Grrrr!", warm "Awww", big "Oof!"', ARRAY['I feel that too sometimes', 'Let''s try breathing together'], '#8B5E3C', '#D4A574'),
('mia', 'Mia the Bunny', 'Bunny', 'social_skills', 'Energetic, brave, intensely kind. First to jump into action and help.', 'Models social connection. Shows how to approach, help, and collaborate.', 'Energetic "Thump thump!", joyful "Wheee!", soft "Awww..."', ARRAY['Can I help?', 'Let''s do it together!'], '#E91E8C', '#FFB6C1'),
('toby', 'Toby the Turtle', 'Turtle', 'responsible_decisions', 'Calm, wise, infinitely patient. Never rushes, never panics.', 'Introduces breathing, calming strategies, and thoughtful decision-making.', 'Long "Hmmmm...", gentle "Ahhhh...", soft "Oh..."', ARRAY['Let''s slow down', 'What could happen if...?'], '#2D8B57', '#3BA6C9'),
('zoe', 'Zoe the Bird', 'Bird', 'social_awareness', 'Joyful, positive, deeply empathetic. Finds something wonderful everywhere.', 'Emotional radar. Spots feelings others miss. Celebrates growth.', 'Bright "Tweet tweet!", concerned "Tweet tweet?", rapid trilling', ARRAY['I noticed something', 'How do you think they feel?'], '#D4A017', '#5B8DB8');
