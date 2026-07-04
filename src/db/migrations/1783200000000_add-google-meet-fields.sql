-- Up Migration
-- Add Google Meet fields to mentor_bookings

ALTER TABLE mentor_bookings
  ADD COLUMN google_event_id TEXT,
  ADD COLUMN google_meet_url TEXT,
  ADD COLUMN google_calendar_url TEXT,
  ADD COLUMN meeting_provider TEXT NOT NULL DEFAULT 'GOOGLE_MEET';

-- Down Migration
ALTER TABLE mentor_bookings
  DROP COLUMN IF EXISTS google_event_id,
  DROP COLUMN IF EXISTS google_meet_url,
  DROP COLUMN IF EXISTS google_calendar_url,
  DROP COLUMN IF EXISTS meeting_provider;
