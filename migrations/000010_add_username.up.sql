ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE users
SET username = COALESCE(NULLIF(split_part(email, '@', 1), ''), 'user_' || substr(id::text, 1, 8))
WHERE username IS NULL OR username = '';

ALTER TABLE users ALTER COLUMN username SET NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);