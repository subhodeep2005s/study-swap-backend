-- Up Migration

-- Enums
CREATE TYPE booking_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'refunded'
);

-- Mentor Plans
CREATE TABLE mentor_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentor_plans_mentor ON mentor_plans(mentor_id);

-- Mentor Slots
CREATE TABLE mentor_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_slot_time CHECK (start_time < end_time)
);

CREATE INDEX idx_mentor_slots_mentor ON mentor_slots(mentor_id);
CREATE INDEX idx_mentor_slots_time ON mentor_slots(start_time);

-- Mentor Bookings
CREATE TABLE mentor_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES mentor_plans(id) ON DELETE RESTRICT,
    slot_id UUID NOT NULL REFERENCES mentor_slots(id) ON DELETE RESTRICT,
    status booking_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    amount NUMERIC(10,2) NOT NULL,
    meeting_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentor_bookings_student ON mentor_bookings(student_id);
CREATE INDEX idx_mentor_bookings_mentor ON mentor_bookings(mentor_id);
CREATE INDEX idx_mentor_bookings_status ON mentor_bookings(status);

-- Down Migration
DROP TABLE IF EXISTS mentor_bookings CASCADE;
DROP TABLE IF EXISTS mentor_slots CASCADE;
DROP TABLE IF EXISTS mentor_plans CASCADE;

DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS booking_status;