-- Add updated_at column to call_sessions (was missing, causes NaN timestamps in socket events)
ALTER TABLE call_sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to focus_sessions (same issue)
ALTER TABLE focus_sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Fix started_at on call_sessions: should NOT default to NOW() at creation.
-- Calls start in RINGING state; started_at should only be set when transitioning to ACTIVE.
ALTER TABLE call_sessions ALTER COLUMN started_at DROP DEFAULT;
