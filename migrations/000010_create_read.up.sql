CREATE TABLE read(
  user_id UUID
    NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  other_id UUID
    NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  listing_id UUID
    NOT NULL 
    REFERENCES listings(id)
    ON DELETE CASCADE,
  last_read_id UUID
    NOT NULL
    REFERENCES messages(id)
    ON DELETE CASCADE,

  PRIMARY KEY (user_id, other_id, listing_id)
)