package recommendation

import (
	db "backend/database"
	"backend/handlers/listings"
	"backend/models"
	"backend/response"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func RecentListings(c *gin.Context) {
	time.Sleep(1 *time.Second)

	l := []models.Listing{}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT
			id,
			seller_id,
			title,
			description,
			price,
			quantity,
			condition,
			category_name,
			created_on
		FROM listings
		ORDER BY created_on DESC
		LIMIT 20`,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
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
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		l = append(l, temp)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	l, err = listings.GetImagesHelper(c, l)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": l,
	})
}