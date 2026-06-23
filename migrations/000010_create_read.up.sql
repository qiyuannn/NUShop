CREATE TABLE read(
  user_id TEXT
    NOT NULL
    REFERENCES users(id),
  other_id TEXT
    NOT NULL
    REFERENCES users(id),
  listing_id TEXT 
    NOT NULL 
    REFERENCES listings(id),
  last_read_id 
    NOT NULL
    REFERENCES messages(id),

  PRIMARY KEY (user_id, other_id, listing_id)
)