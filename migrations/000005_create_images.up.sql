CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE images (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_uuid UUID NOT NULL REFERENCES listings(uuid),
  file_url TEXT NOT NULL
)