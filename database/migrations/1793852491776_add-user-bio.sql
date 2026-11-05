-- Up Migration
ALTER TABLE users ADD COLUMN bio TEXT;

-- Down Migration
ALTER TABLE users DROP COLUMN bio;