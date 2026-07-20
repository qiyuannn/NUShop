CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
    name TEXT 
      PRIMARY KEY 
      DEFAULT 'Others'

);

INSERT INTO categories (name) VALUES ('Others'), ('Electronics'), ('Sports'), ('Cosmetics');