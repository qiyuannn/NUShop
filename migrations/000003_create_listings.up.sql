CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE listings (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(uuid) 
        ON DELETE CASCADE 
        NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price BIGINT CHECK (price >= 0)
        NOT NULL,
    quantity BIGINT CHECK (quantity >= 0)
        NOT NULL,
    category_uuid UUID DEFAULT '00000000-0000-0000-0000-000000000000'
        REFERENCES categories(uuid) 
        ON DELETE SET DEFAULT
        NOT NULL,
    created_on TIMESTAMPTZ DEFAULT now()
        NOT NULL
);

CREATE INDEX idx_listings_created_uuid
    ON listings (created_on, uuid);