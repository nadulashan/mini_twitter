-- Up Migration

ALTER TABLE users
ADD CONSTRAINT users_username_valid
CHECK (
    username <> ''
    AND username = BTRIM(username)
);

ALTER TABLE users
ADD CONSTRAINT users_email_valid
CHECK (
    email <> ''
    AND email = LOWER(BTRIM(email))
);

ALTER TABLE posts
ADD CONSTRAINT posts_content_valid
CHECK (
    content <> ''
    AND content = BTRIM(content)
    AND CHAR_LENGTH(content) <=280
);


-- Down Migration
ALTER TABLE users
DROP CONSTRAINT users_username_valid;

ALTER TABLE users
DROP CONSTRAINT users_email_valid;

ALTER TABLE posts
DROP CONSTRAINT posts_content_valid;