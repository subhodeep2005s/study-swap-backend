-- Up Migration
DROP TABLE IF EXISTS anonymous_post_me_too CASCADE;

-- Down Migration
CREATE TABLE IF NOT EXISTS anonymous_post_me_too (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES anonymous_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);
