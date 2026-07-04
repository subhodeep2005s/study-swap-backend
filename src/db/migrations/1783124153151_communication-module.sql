-- Enums
CREATE TYPE message_type_enum AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'VOICE_NOTE', 'SYSTEM');
CREATE TYPE call_type_enum AS ENUM ('VOICE', 'VIDEO');
CREATE TYPE call_status_enum AS ENUM ('RINGING', 'ACTIVE', 'ENDED');
CREATE TYPE call_ended_reason_enum AS ENUM ('REJECTED', 'MISSED', 'CANCELLED', 'COMPLETED');
CREATE TYPE focus_status_enum AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- Conversations Table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID UNIQUE NOT NULL REFERENCES user_matches(id) ON DELETE CASCADE,
  -- last_message_id will be added via ALTER TABLE to avoid circular FK
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_match_id ON conversations(match_id);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type message_type_enum NOT NULL,
  message TEXT,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id_created_at ON messages(conversation_id, created_at DESC);

-- Fix Circular FK
ALTER TABLE conversations ADD COLUMN last_message_id UUID;
ALTER TABLE conversations 
  ADD CONSTRAINT fk_last_message 
  FOREIGN KEY (last_message_id) 
  REFERENCES messages(id) 
  ON DELETE SET NULL;

-- Message Attachments Table
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extension TEXT NOT NULL,
  size BIGINT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- Call Sessions Table
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  type call_type_enum NOT NULL,
  status call_status_enum NOT NULL,
  ended_reason call_ended_reason_enum,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_sessions_conversation_id_status ON call_sessions(conversation_id, status);
CREATE UNIQUE INDEX unique_active_call ON call_sessions(conversation_id) WHERE status IN ('RINGING', 'ACTIVE');

-- Focus Sessions Table
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  status focus_status_enum NOT NULL,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_active_focus ON focus_sessions(conversation_id) WHERE status IN ('PENDING', 'ACTIVE');
