CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

INSERT INTO categories (uuid, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Others');