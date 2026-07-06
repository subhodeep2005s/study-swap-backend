-- Up Migration

CREATE TABLE mentor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_availability_time CHECK (start_time < end_time)
);

CREATE INDEX idx_mentor_availability_mentor ON mentor_availability(mentor_id);

-- Down Migration

DROP TABLE IF EXISTS mentor_availability CASCADE;
