-- Up Migration
-- Personal Study Sessions
-- Tracks individual timed study sessions for a single student on a single AI study task.
-- COMPLETELY INDEPENDENT from communication.focus_sessions (student↔student collaborative).

CREATE TYPE personal_session_status AS ENUM ('active', 'paused', 'completed', 'abandoned');

CREATE TABLE personal_study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES study_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status personal_session_status NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paused_at TIMESTAMPTZ,                        -- set when paused, cleared on resume
    ended_at TIMESTAMPTZ,                         -- set on complete or abandoned
    duration_seconds INTEGER,                     -- total elapsed seconds (excluding pauses), written on end
    accumulated_seconds INTEGER NOT NULL DEFAULT 0, -- running tally updated on pause
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one ACTIVE session is allowed per task at any time
CREATE UNIQUE INDEX uq_one_active_session_per_task
    ON personal_study_sessions(task_id)
    WHERE status = 'active';

-- Only one ACTIVE OR PAUSED session per user at any time
-- (a student cannot be studying two tasks simultaneously)
CREATE UNIQUE INDEX uq_one_active_session_per_user
    ON personal_study_sessions(user_id)
    WHERE status IN ('active', 'paused');

CREATE INDEX idx_personal_sessions_task   ON personal_study_sessions(task_id);
CREATE INDEX idx_personal_sessions_user   ON personal_study_sessions(user_id);
CREATE INDEX idx_personal_sessions_status ON personal_study_sessions(status);


-- Down Migration
DROP TABLE IF EXISTS personal_study_sessions CASCADE;
DROP TYPE IF EXISTS personal_session_status;
