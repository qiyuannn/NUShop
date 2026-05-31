CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

INSERT INTO categories (uuid, name) VALUES ('1f59bfef-c791-4c70-a8ec-90b795030869', 'Others');