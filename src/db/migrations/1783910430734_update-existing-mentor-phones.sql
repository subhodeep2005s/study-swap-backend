-- Up Migration
UPDATE mentors SET phone_number = '+910000000000' WHERE phone_number IS NULL;

-- Down Migration
UPDATE mentors SET phone_number = NULL WHERE phone_number = '+910000000000';