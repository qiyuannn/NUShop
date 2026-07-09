CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE events (
  id UUID 
    PRIMARY KEY 
    DEFAULT gen_random_uuid(),
  user_id UUID 
    NOT NULL
    REFERENCES users(id),
  event_type TEXT
    NOT NULL
    CHECK (event_type IN ('view', 'search')),
  listing_id UUID
    DEFAULT NULL
    REFERENCES listings(id),
  category TEXT
    NOT NULL,
  created_on TIMESTAMPTZ DEFAULT NOW()
    NOT NULL,

  CHECK (
    event_type <> 'view' OR 
    listing_id IS NOT NULL
  )
)