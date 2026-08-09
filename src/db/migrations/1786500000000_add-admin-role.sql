-- Up Migration
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Down Migration
-- (Cannot easily remove an enum value in Postgres)
