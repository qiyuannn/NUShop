CREATE MATERIALIZED VIEW listing_popularity AS 
  SELECT
    l.id,
    COALESCE(
      SUM(
        CASE e.event_type
          WHEN 'view' THEN 1
          ELSE 0
        END
        * EXP( -LN(2) * EXTRACT(EPOCH FROM (NOW() - e.created_on)) / (7 * 86400.0) )
      ),
      0
    ) AS score
  FROM listings l
  LEFT JOIN events e
    ON e.listing_id = l.id
  GROUP BY l.id;

CREATE UNIQUE INDEX idx_listing_popularity_id ON listing_popularity (id);
