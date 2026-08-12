-- Up Migration

CREATE TYPE hall_of_fame_achievement_type AS ENUM (
  'EXAM_CLEARED',
  'SCORE_IMPROVEMENT',
  'COLLEGE_ADMISSION',
  'JOB_PLACEMENT',
  'RANK_ACHIEVEMENT',
  'ACADEMIC_ACHIEVEMENT',
  'COMPETITION_ACHIEVEMENT',
  'CERTIFICATION',
  'SCHOLARSHIP',
  'COMEBACK',
  'CONSISTENCY',
  'OTHER'
);

CREATE TYPE hall_of_fame_media_type AS ENUM (
  'NONE',
  'IMAGE',
  'VIDEO'
);

CREATE TYPE hall_of_fame_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED'
);

CREATE TABLE hall_of_fame (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    short_description TEXT,
    story TEXT NOT NULL,
    person_name TEXT NOT NULL,
    person_role TEXT,
    achievement_type hall_of_fame_achievement_type NOT NULL,
    achievement_year INTEGER NOT NULL CHECK (achievement_year >= 1900 AND achievement_year <= 2100),
    result_label TEXT,
    result_before TEXT,
    result_after TEXT,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    media_type hall_of_fame_media_type NOT NULL DEFAULT 'NONE',
    media_key TEXT,
    thumbnail_key TEXT,
    status hall_of_fame_status NOT NULL DEFAULT 'DRAFT',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    
    -- Analytics
    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    saves_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    
    -- Tracking
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_hall_of_fame_status ON hall_of_fame(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_hall_of_fame_country ON hall_of_fame(country_id);
CREATE INDEX idx_hall_of_fame_achievement_year ON hall_of_fame(achievement_year);
CREATE INDEX idx_hall_of_fame_achievement_type ON hall_of_fame(achievement_type);
CREATE INDEX idx_hall_of_fame_is_featured ON hall_of_fame(is_featured) WHERE deleted_at IS NULL AND status = 'PUBLISHED';
CREATE INDEX idx_hall_of_fame_published_at ON hall_of_fame(published_at);
CREATE INDEX idx_hall_of_fame_created_at ON hall_of_fame(created_at);

-- Intersection table for Education Nodes
CREATE TABLE hall_of_fame_education_nodes (
    hall_of_fame_id UUID NOT NULL REFERENCES hall_of_fame(id) ON DELETE CASCADE,
    education_node_id UUID NOT NULL REFERENCES education_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (hall_of_fame_id, education_node_id)
);

CREATE INDEX idx_hall_of_fame_education_nodes_node ON hall_of_fame_education_nodes(education_node_id);

-- Tracking user views (for deduplication)
CREATE TABLE hall_of_fame_views (
    hall_of_fame_id UUID NOT NULL REFERENCES hall_of_fame(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (hall_of_fame_id, user_id)
);

-- Tracking user likes
CREATE TABLE hall_of_fame_likes (
    hall_of_fame_id UUID NOT NULL REFERENCES hall_of_fame(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (hall_of_fame_id, user_id)
);

-- Tracking helpful reactions
CREATE TABLE hall_of_fame_helpful (
    hall_of_fame_id UUID NOT NULL REFERENCES hall_of_fame(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (hall_of_fame_id, user_id)
);

-- Tracking user saves
CREATE TABLE hall_of_fame_saves (
    hall_of_fame_id UUID NOT NULL REFERENCES hall_of_fame(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (hall_of_fame_id, user_id)
);

-- Comments Table
CREATE TABLE hall_of_fame_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_of_fame_id UUID NOT NULL REFERENCES hall_of_fame(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES hall_of_fame_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_hall_of_fame_comments_story ON hall_of_fame_comments(hall_of_fame_id);
CREATE INDEX idx_hall_of_fame_comments_parent ON hall_of_fame_comments(parent_comment_id);


-- Down Migration

DROP TABLE IF EXISTS hall_of_fame_comments CASCADE;
DROP TABLE IF EXISTS hall_of_fame_saves CASCADE;
DROP TABLE IF EXISTS hall_of_fame_helpful CASCADE;
DROP TABLE IF EXISTS hall_of_fame_likes CASCADE;
DROP TABLE IF EXISTS hall_of_fame_views CASCADE;
DROP TABLE IF EXISTS hall_of_fame_education_nodes CASCADE;
DROP TABLE IF EXISTS hall_of_fame CASCADE;
DROP TYPE IF EXISTS hall_of_fame_status;
DROP TYPE IF EXISTS hall_of_fame_media_type;
DROP TYPE IF EXISTS hall_of_fame_achievement_type;