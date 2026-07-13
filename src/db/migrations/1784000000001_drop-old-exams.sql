-- Up Migration

DROP TABLE IF EXISTS user_exams CASCADE;
DROP TABLE IF EXISTS exams CASCADE;

-- Down Migration
-- Note: Down migration cannot restore data without a backup.
-- To reverse, you would need to recreate the tables as they were in the original schema.
