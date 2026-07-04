-- Up Migration
ALTER TABLE users ADD COLUMN notification_token TEXT;

-- Down Migration
ALTER TABLE users DROP COLUMN notification_token;
