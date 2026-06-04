CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id)
  ON DELETE CASCADE,
  file_url TEXT NOT NULL
)