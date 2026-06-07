CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
    name TEXT PRIMARY KEY
);

INSERT INTO categories (name) VALUES ('Others'), ('Electionics'), ('Sports'), ('Cosmetics');