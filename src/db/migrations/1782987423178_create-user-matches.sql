-- Up Migration
CREATE TYPE match_status AS ENUM (
    'pending',
    'saved',
    'accepted',
    'rejected',
    'removed'
);

CREATE TYPE match_reason_enum AS ENUM (
    'exam',
    'state'
);

CREATE TABLE user_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    matched_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    matched_by match_reason_enum NOT NULL,
    status match_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, matched_user_id)
);

CREATE INDEX idx_user_matches_user_id ON user_matches(user_id);
CREATE INDEX idx_user_matches_matched_user_id ON user_matches(matched_user_id);
CREATE INDEX idx_user_matches_status ON user_matches(status);

-- Down Migration
DROP TABLE IF EXISTS user_matches CASCADE;
DROP TYPE IF EXISTS match_reason_enum;
DROP TYPE IF EXISTS match_status;