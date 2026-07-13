-- Up Migration
ALTER TABLE user_matches ADD COLUMN shown_at TIMESTAMPTZ;
ALTER TABLE user_matches ADD COLUMN matched_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_matches ADD COLUMN source_priority INTEGER;
ALTER TABLE user_matches ADD COLUMN refresh_number INTEGER DEFAULT 1;

-- Down Migration
ALTER TABLE user_matches DROP COLUMN shown_at;
ALTER TABLE user_matches DROP COLUMN matched_at;
ALTER TABLE user_matches DROP COLUMN source_priority;
ALTER TABLE user_matches DROP COLUMN refresh_number;
