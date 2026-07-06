package cart

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AddToCartRequest struct {
	ListingID string `json:"listingID"`
	Quantity int `json:"quantity" binding:"gt=0"`
	Replace bool `json:"replace"`
}

func AddToCart(c *gin.Context){
	userIdValue, ok := c.Get("userID")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}

	userIdStr, ok := userIdValue.(string)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	if _, err := uuid.Parse(userIdStr); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	var addToCartRequest AddToCartRequest
	if err := c.ShouldBindJSON(&addToCartRequest); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	var sellerID string
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT seller_id 
		FROM listings WHERE id = $1`, 
		addToCartRequest.ListingID,
	).Scan(&sellerID); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if sellerID == userIdStr {
		c.Error(response.ErrBadRequest(errors.New("Unable to add your own lisitng to cart")))
		return
	}

	var cart models.Cart
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`INSERT INTO cart 
		( user_id, listing_id, quantity )
		VALUES ( $1, $2, $3 )
		ON CONFLICT( user_id, listing_id )
		DO UPDATE
		SET quantity = CASE 
			WHEN $4 THEN EXCLUDED.quantity
			ELSE cart.quantity + EXCLUDED.quantity
		END
		RETURNING user_id, listing_id, quantity`,
		userIdStr, addToCartRequest.ListingID, addToCartRequest.Quantity, addToCartRequest.Replace,
	).Scan(&cart.UserID, &cart.ListingID, &cart.Quantity); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

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
		cart.ListingID,
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
		c.Error(response.ErrInternalServerError(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		file_url
		FROM images
		WHERE listing_id = $1`,
		cart.ListingID,
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

	response.Success(c, http.StatusOK, gin.H{
		"cartItem" : gin.H{
			"listing" : listing,
			"quantity" : cart.Quantity,
		},
	})
}