CREATE TABLE cart(
  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  listing_id UUID NOT NULL
    REFERENCES listings(id)
    ON DELETE CASCADE,
  quantity INT NOT NULL
    CHECK (quantity > 0),

  PRIMARY KEY (user_id, listing_id)
)