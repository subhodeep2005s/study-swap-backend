-- Up Migration
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    status_code INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Down Migration
DROP TABLE IF EXISTS audit_logs CASCADE;