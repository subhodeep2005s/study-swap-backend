-- Up Migration
ALTER TABLE countries ADD COLUMN iso_code VARCHAR(2);

-- Down Migration
ALTER TABLE countries DROP COLUMN iso_code;