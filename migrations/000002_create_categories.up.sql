CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

INSERT INTO categories (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Others');