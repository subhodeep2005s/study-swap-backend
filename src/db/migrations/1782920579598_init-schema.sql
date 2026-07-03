-- Up Migration

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================
-- ENUMS
-- ===========================

CREATE TYPE user_role AS ENUM (
    'student',
    'mentor'
);

CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
);

CREATE TYPE study_time AS ENUM (
    'morning',
    'afternoon',
    'evening',
    'late_night'
);

-- ===========================
-- USERS
-- ===========================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL UNIQUE,

    role user_role NOT NULL DEFAULT 'student',

    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================
-- COUNTRIES
-- ===========================

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    flag TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================
-- EXAMS
-- ===========================

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================
-- PROFILES
-- ===========================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    country_id UUID REFERENCES countries(id) ON DELETE SET NULL,

    full_name TEXT,

    profile_image TEXT,

    age INTEGER,

    gender gender_type,

    state TEXT,

    bio TEXT,

    strong_in TEXT,

    need_help_with TEXT,

    study_time study_time,

    looking_for TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================
-- USER EXAMS
-- ===========================

CREATE TABLE user_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, exam_id)
);

-- ===========================
-- MENTORS
-- ===========================

CREATE TABLE mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    title TEXT,

    qualification TEXT,

    experience_years INTEGER,

    hourly_price NUMERIC(10,2),

    rating NUMERIC(3,2) DEFAULT 0,

    total_reviews INTEGER DEFAULT 0,

    about TEXT,

    is_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================
-- INDEXES
-- ===========================

CREATE INDEX idx_profiles_country
ON profiles(country_id);

CREATE INDEX idx_exams_country
ON exams(country_id);

CREATE INDEX idx_user_exams_user
ON user_exams(user_id);

CREATE INDEX idx_user_exams_exam
ON user_exams(exam_id);

CREATE INDEX idx_users_email
ON users(email);


-- Down Migration
DROP TABLE IF EXISTS mentors CASCADE;
DROP TABLE IF EXISTS user_exams CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS study_time;
DROP TYPE IF EXISTS gender_type;
DROP TYPE IF EXISTS user_role;