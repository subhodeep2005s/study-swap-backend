-- Up Migration

-- 1. Enum Types
CREATE TYPE forum_post_type AS ENUM ('STORY', 'QUESTION', 'RANT', 'ADVICE', 'DISCUSSION', 'POLL');
CREATE TYPE forum_post_status AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED', 'FLAGGED');
CREATE TYPE forum_media_type AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');
CREATE TYPE forum_report_reason AS ENUM (
  'SPAM', 'HARASSMENT', 'BULLYING', 'HATE', 'SEXUAL_CONTENT', 
  'SELF_HARM', 'VIOLENCE', 'SCAM', 'MISINFORMATION', 'OTHER'
);

-- 2. Anonymous Profiles
CREATE TABLE anonymous_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_key TEXT,
  avatar_url TEXT,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(display_name)
);

-- 3. Categories
CREATE TABLE anonymous_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-seed some default categories
INSERT INTO anonymous_categories (name, description, sort_order) VALUES
('Exam Stress', 'Discuss pressure related to upcoming exams', 1),
('Success Stories', 'Share your achievements and milestones', 2),
('Career', 'Career advice and path discussions', 3),
('Study Motivation', 'Find and share motivation', 4),
('Mental Wellbeing', 'Safe space for mental health discussions', 5),
('General Discussion', 'Anything related to student life', 6);

-- 4. Posts
CREATE TABLE anonymous_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_profile_id UUID NOT NULL REFERENCES anonymous_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES anonymous_categories(id) ON DELETE RESTRICT,
  type forum_post_type NOT NULL DEFAULT 'DISCUSSION',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status forum_post_status NOT NULL DEFAULT 'PUBLISHED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_anonymous_posts_created_at ON anonymous_posts(created_at DESC, id DESC);
CREATE INDEX idx_anonymous_posts_category ON anonymous_posts(category_id);
CREATE INDEX idx_anonymous_posts_profile ON anonymous_posts(anonymous_profile_id);
CREATE INDEX idx_anonymous_posts_status ON anonymous_posts(status);

-- 5. Media
CREATE TABLE anonymous_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  type forum_media_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_anonymous_post_media_post ON anonymous_post_media(post_id);

-- 6. Polls
CREATE TABLE anonymous_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

CREATE TABLE anonymous_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES anonymous_polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE anonymous_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES anonymous_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES anonymous_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);

-- 7. Comments
CREATE TABLE anonymous_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  anonymous_profile_id UUID NOT NULL REFERENCES anonymous_profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES anonymous_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status forum_post_status NOT NULL DEFAULT 'PUBLISHED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_anonymous_comments_post ON anonymous_comments(post_id);
CREATE INDEX idx_anonymous_comments_parent ON anonymous_comments(parent_comment_id);

-- 8. Likes and Me Too
CREATE TABLE anonymous_post_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE anonymous_post_me_too (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE anonymous_comment_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES anonymous_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- 9. Saved Posts
CREATE TABLE anonymous_saved_posts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 10. Reports
CREATE TABLE anonymous_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('POST', 'COMMENT', 'PROFILE')),
  target_id UUID NOT NULL,
  reason forum_report_reason NOT NULL,
  details TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- 11. Blocks
CREATE TABLE anonymous_blocks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_anonymous_profile_id UUID NOT NULL REFERENCES anonymous_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, blocked_anonymous_profile_id)
);

-- Down Migration
DROP TABLE IF EXISTS anonymous_blocks CASCADE;
DROP TABLE IF EXISTS anonymous_reports CASCADE;
DROP TABLE IF EXISTS anonymous_saved_posts CASCADE;
DROP TABLE IF EXISTS anonymous_comment_likes CASCADE;
DROP TABLE IF EXISTS anonymous_post_me_too CASCADE;
DROP TABLE IF EXISTS anonymous_post_likes CASCADE;
DROP TABLE IF EXISTS anonymous_comments CASCADE;
DROP TABLE IF EXISTS anonymous_poll_votes CASCADE;
DROP TABLE IF EXISTS anonymous_poll_options CASCADE;
DROP TABLE IF EXISTS anonymous_polls CASCADE;
DROP TABLE IF EXISTS anonymous_post_media CASCADE;
DROP TABLE IF EXISTS anonymous_posts CASCADE;
DROP TABLE IF EXISTS anonymous_categories CASCADE;
DROP TABLE IF EXISTS anonymous_profiles CASCADE;

DROP TYPE IF EXISTS forum_report_reason;
DROP TYPE IF EXISTS forum_media_type;
DROP TYPE IF EXISTS forum_post_status;
DROP TYPE IF EXISTS forum_post_type;