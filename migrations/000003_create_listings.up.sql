CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id) 
        ON DELETE CASCADE 
        NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price BIGINT CHECK (price >= 0)
        NOT NULL,
    quantity BIGINT CHECK (quantity >= 0)
        NOT NULL,
    condition TEXT NOT NULL,
    category_name TEXT DEFAULT 'Others'
        REFERENCES categories(name) 
        ON DELETE SET DEFAULT
        NOT NULL,
    created_on TIMESTAMPTZ DEFAULT NOW()
        NOT NULL,

    search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', title), 'A') ||
        setweight(to_tsvector('english', description), 'B') ||
        setweight(to_tsvector('english', category_name), 'C')
      ) STORED
);

CREATE INDEX idx_listings_created_id
    ON listings (created_on, id);

CREATE INDEX idx_vector_search
  ON listings using GIN(search_vector);

CREATE INDEX idx_trigram_search_title
  ON listings using GIN(title gin_trgm_ops);

CREATE INDEX idx_trigram_search_category
  ON listings using GIN(category_name gin_trgm_ops);

CREATE INDEX idx_trigram_search_description
  ON listings using GIN(description gin_trgm_ops);