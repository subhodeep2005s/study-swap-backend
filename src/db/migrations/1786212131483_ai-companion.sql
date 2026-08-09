-- Up Migration

-- 1. AI Conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated ON ai_conversations(updated_at DESC);

-- 2. AI Messages
CREATE TYPE ai_message_role AS ENUM ('user', 'model', 'system');

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role ai_message_role NOT NULL,
    content TEXT,
    metadata JSONB, -- For tool calls and function responses
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created ON ai_messages(created_at DESC);

-- 3. Study Plans
CREATE TYPE study_plan_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL, -- Target date for this plan
    status study_plan_status NOT NULL DEFAULT 'active',
    planned_minutes INTEGER NOT NULL DEFAULT 0,
    actual_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date) -- One plan per day per user
);
CREATE INDEX idx_study_plans_user ON study_plans(user_id);

-- 4. Study Tasks
CREATE TYPE study_task_status AS ENUM ('pending', 'completed', 'skipped', 'rescheduled');
CREATE TYPE study_task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE study_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT, -- e.g. "Physics"
    duration INTEGER NOT NULL, -- planned duration in minutes
    start_time TIMESTAMPTZ, -- Optional specific planned start time
    status study_task_status NOT NULL DEFAULT 'pending',
    priority study_task_priority NOT NULL DEFAULT 'medium',
    completed_at TIMESTAMPTZ,
    actual_duration INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_study_tasks_plan ON study_tasks(plan_id);
CREATE INDEX idx_study_tasks_status ON study_tasks(status);
CREATE INDEX idx_study_tasks_start_time ON study_tasks(start_time);


-- Down Migration
DROP TABLE IF EXISTS study_tasks CASCADE;
DROP TABLE IF EXISTS study_plans CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;

DROP TYPE IF EXISTS study_task_priority;
DROP TYPE IF EXISTS study_task_status;
DROP TYPE IF EXISTS study_plan_status;
DROP TYPE IF EXISTS ai_message_role;