package recommendation

import (
	db "backend/database"
	"log"
	"math"

	"github.com/gin-gonic/gin"
)

func GetCategoryScoresV2(c *gin.Context, userID string) ([]CategoryScore, error) {
	categoryScores := []CategoryScore{}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
			category,
			FLOOR (
				SUM (
					CASE event_type 
						WHEN 'purchase' THEN 10
						WHEN 'view' THEN 2
						WHEN 'search' THEN 1
					END * EXP( -LN(2) * EXTRACT(EPOCH FROM (NOW() - created_on)) / (7 * 86400.0) )
				)
			) AS score 
		FROM events
		WHERE user_id = $1
		GROUP BY category
		ORDER BY score DESC`,
		userID,
	)

	if err != nil {
		log.Printf("[Error] getCategoryScore error for %s: %s", userID, err)
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var cs CategoryScore
		if err := rows.Scan(&cs.Category, &cs.Score); err != nil {
			log.Printf("[Error] getCategoryScore error for %s: %s", userID, err)
			return nil, err
		}
		categoryScores = append(categoryScores, cs)
	}

	if err := rows.Err(); err != nil {
		log.Printf("[Error] getCategoryScore error for %s: %s", userID, err)
		return nil, err
	}

	totalScore := 0

	for _, cs := range categoryScores {
		totalScore += cs.Score
	}

	listingsCount := 20 // Set the upper bound of listings to return

	if totalScore > 0 {
		for i := range categoryScores {
			categoryScores[i].Score = int(math.Floor(float64(categoryScores[i].Score) / float64(totalScore) * float64(listingsCount),
))
		}
	}

	return categoryScores, nil 
}