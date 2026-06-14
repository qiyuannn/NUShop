ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_sub TEXT;

ALTER TABLE users
ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);