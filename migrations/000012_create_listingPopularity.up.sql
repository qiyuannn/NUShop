CREATE MATERIALIZED VIEW listing_popularity AS 
  SELECT
    listing_id,
    SUM (
      CASE event_type
        WHEN 'view' THEN 1
        ELSE 0
      END * EXP( -LN(2) * EXTRACT(EPOCH FROM (NOW() - created_on)) / (7 * 86400.0) )
    ) AS score
  FROM events
  WHERE listing_id IS NOT NULL
  GROUP BY listing_id;

CREATE UNIQUE INDEX idx_listing_popularity_id ON listing_popularity (listing_id);