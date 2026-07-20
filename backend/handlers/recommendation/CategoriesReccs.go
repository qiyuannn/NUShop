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

func CategoriesReccs(c *gin.Context) {
	time.Sleep(1 *time.Second)

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT name 
		FROM categories`,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()
	
	categories := []string{}

	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		if cat != "Others" {
			categories = append(categories, cat)
		}
	}

	categories = append(categories, `Others`)

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	rows.Close()

	categoryListings := []CategoryListing{}

	for _, val := range categories{
		listings, err := getCategoryReccs(c, val)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		categoryListings = append(categoryListings, 
			CategoryListing{Category: val, 
			Listings: listings,
		})
	}

	response.Success(c, http.StatusOK, gin.H{
		"categoryListings": categoryListings,
	})
}

func getCategoryReccs(c *gin.Context, category string) ([]models.Listing, error) {
	l := []models.Listing{}

	rows, err := db.Pool.Query(
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
			COALESCE(p.score, 0)
		FROM listings l
		LEFT JOIN listing_popularity p
			ON p.id = l.id
		WHERE l.category_name = $1
		ORDER BY p.score DESC
		LIMIT 20`,
		category,
	)

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

	return listings.GetImagesHelper(c, l)
}