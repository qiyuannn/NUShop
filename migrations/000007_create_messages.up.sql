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
  content TEXT 
    NOT NULL,
  read boolean
    NOT NULL
    DEFAULT false,
  created_on TIMESTAMPTZ
    NOT NULL
    DEFAULT now()
)