-- Up Migration
ALTER TYPE match_reason_enum ADD VALUE IF NOT EXISTS 'exam_state';

-- Down Migration
-- Note: PostgreSQL does not support removing values from an enum type.
-- To fully revert, you would need to recreate the type and update all references.
