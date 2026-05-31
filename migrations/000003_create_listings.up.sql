CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE listings (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_uuid UUID REFERENCES users(uuid) 
        ON DELETE CASCADE 
        NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price BIGINT CHECK (price >= 0)
        NOT NULL,
    quantity BIGINT CHECK (quantity >= 0)
        NOT NULL,
    condition TEXT NOT NULL,
    category_uuid UUID DEFAULT '1f59bfef-c791-4c70-a8ec-90b795030869'
        REFERENCES categories(uuid) 
        ON DELETE SET DEFAULT
        NOT NULL,
    created_on TIMESTAMPTZ DEFAULT NOW()
        NOT NULL
);

CREATE INDEX idx_listings_created_uuid
    ON listings (created_on, uuid);