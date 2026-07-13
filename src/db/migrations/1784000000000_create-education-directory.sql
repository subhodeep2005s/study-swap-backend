-- Up Migration

CREATE TYPE education_node_type AS ENUM (
    'COUNTRY',
    'CATEGORY',
    'SUB_CATEGORY',
    'GROUP',
    'BOARD',
    'STREAM',
    'COURSE',
    'EXAM',
    'SPECIALIZATION',
    'CLASS',
    'SUBJECT',
    'LEAF'
);

CREATE TABLE education_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES education_nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    node_type education_node_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recursive index to speed up hierarchical queries
CREATE INDEX idx_education_nodes_parent ON education_nodes(parent_id);
CREATE INDEX idx_education_nodes_country ON education_nodes(country_id);

CREATE TABLE user_education_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES education_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, node_id)
);

CREATE INDEX idx_user_education_nodes_user ON user_education_nodes(user_id);
CREATE INDEX idx_user_education_nodes_node ON user_education_nodes(node_id);

-- Down Migration
DROP TABLE IF EXISTS user_education_nodes CASCADE;
DROP TABLE IF EXISTS education_nodes CASCADE;
DROP TYPE IF EXISTS education_node_type;
