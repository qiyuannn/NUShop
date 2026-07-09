package listings

import (
	db "backend/database"
	"backend/models"
	"backend/recommendation"
	"backend/response"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)



func GetListing(c *gin.Context) { //single
	param := c.Param("listingID")

	var listing models.Listing
	if err := db.Pool.QueryRow(
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
		FROM listings WHERE id=$1`,
		param,
	).Scan(
		&listing.ID,
		&listing.SellerID,
		&listing.Title,
		&listing.Description,
		&listing.Price,
		&listing.Quantity,
		&listing.Condition,
		&listing.CategoryName,
		&listing.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(err))
			return
		}
		fmt.Print(err)
		c.Error(response.ErrInternalServerError(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		file_url
		FROM images
		WHERE listing_id = $1`,
		param,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer rows.Close()

	images := []string{}
	for rows.Next() {
		var image_url string
		if err := rows.Scan(&image_url); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		images = append(images, image_url)
	}
	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	listing.Images = images

	if userID, exists := c.Get("userID"); exists && listing.SellerID != userID{
		userIDstr := userID.(string)
		go recommendation.TrackView(userIDstr, listing.ID)
	}

	response.Success(c, http.StatusOK, gin.H{
		"listing": listing,
	})
}