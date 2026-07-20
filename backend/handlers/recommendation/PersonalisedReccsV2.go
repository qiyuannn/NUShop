package recommendation

import (
	db "backend/database"
	"backend/handlers/listings"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)



func PersonalisedReccsV2(c *gin.Context) {
	time.Sleep(1 *time.Second)

	userIDValue, ok := c.Get("userID")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}
	userIDStr, ok := userIDValue.(string)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	listings, err := GetReccomendationsListings(c, userIDStr)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": listings,
	})
}

func GetReccomendationsListings(c *gin.Context, userID string) ([]models.Listing, error) {
	categoryScores, err := GetCategoryScoresV2(c, userID)
	if err!= nil {
		return nil, err
	}

	tx, err := db.Pool.Begin(c.Request.Context())
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(c.Request.Context())

	l := []models.Listing{}

	for _, cs := range categoryScores {
		rows, err := tx.Query(
			c.Request.Context(),
			`SELECT 
				l.id,
				l.seller_id,
				l.title,
				l.description,
				l.price,
				l.quantity,
				l.condition,
				l.category_name,
				l.created_on,
				( 0.25 * (COALESCE(p.score, 0) / (COALESCE(p.score, 0) + 10)) +
					0.25 * EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - l.created_on)) / (7 * 86400)) + 
					0.5 * ((hashtext(l.id::text || $2)::float8 / 2147483647.0 + 1) / 2)) AS score
			FROM listings l
			LEFT JOIN listing_popularity p
				ON p.id = l.id
			WHERE category_name  = $1
			ORDER BY score DESC
			LIMIT $3`,
			cs.Category, uuid.New(), cs.Score,
		); 
		
		if err != nil {
			return nil, err
		}

		for rows.Next() {
			var temp models.Listing
			if err := rows.Scan(
				&temp.ID,
				&temp.SellerID,
				&temp.Title,
				&temp.Description,
				&temp.Price,
				&temp.Quantity,
				&temp.Condition,
				&temp.CategoryName,
				&temp.CreatedOn,
				&temp.Score,
			); err != nil {
				return nil, err
			}
			l = append(l, temp)
		}

		if err := rows.Err(); err != nil {
			return nil, err
		}

		rows.Close()
	}

	return listings.GetImagesHelper(c, l)
}