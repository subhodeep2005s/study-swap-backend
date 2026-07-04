-- Add indexes to improve communication module performance

-- 1. Unread messages count for conversations list
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;

-- 2. Message pagination
CREATE INDEX IF NOT EXISTS idx_messages_pagination ON messages(conversation_id, created_at DESC, id DESC);

-- 3. Call history pagination
CREATE INDEX IF NOT EXISTS idx_call_history ON call_sessions(conversation_id, created_at DESC, id DESC);

-- 4. Focus history pagination
CREATE INDEX IF NOT EXISTS idx_focus_history ON focus_sessions(conversation_id, created_at DESC, id DESC);

-- 5. Conversations sort ordering
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
