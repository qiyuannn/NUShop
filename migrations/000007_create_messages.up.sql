CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE messages (
  id UUID 
    PRIMARY KEY
    DEFAULT gen_random_uuid(),
  sender_id UUID 
    NOT NULL 
    REFERENCES users(id),
  receiver_id UUID 
    NOT NULL
    REFERENCES users(id),
  listing_id UUID 
    NOT NULL
    REFERENCES listings(id),
  content TEXT 
    NOT NULL,
  created_on TIMESTAMPTZ
    NOT NULL
    DEFAULT now()
)