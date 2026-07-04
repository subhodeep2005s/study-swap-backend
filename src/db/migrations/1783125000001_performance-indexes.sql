-- Add indexes to improve matching and mentor search performance

-- 1. Pagination for matching lists (pending, saved, accepted)
CREATE INDEX IF NOT EXISTS idx_user_matches_pagination ON user_matches(user_id, status, created_at DESC);

-- 2. Performance for finding available mentor slots
CREATE INDEX IF NOT EXISTS idx_mentor_slots_available ON mentor_slots(mentor_id, start_time) WHERE is_booked = false;
