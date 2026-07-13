-- Up Migration
ALTER TABLE mentors ADD COLUMN phone_number TEXT;

-- Down Migration
ALTER TABLE mentors DROP COLUMN phone_number;