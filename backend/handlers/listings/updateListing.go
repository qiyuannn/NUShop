package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type CreateListingRequest struct {
	Title        string    `form:"title"`
	Description  string    `form:"description"`
	Price        int64     `form:"price" binding:"gte=0"`
	Quantity     int64     `form:"quantity" binding:"gte=0"`
	Condition    string    `form:"condition"`
	CategoryUUID string `form:"category"`
}

func UpdateListing(c *gin.Context) {
	userIDValue, ok := c.Get("user_id")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	var listing CreateListingRequest
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	idVal := c.Param("id")
	id, err := uuid.Parse(idVal)
	if err != nil {
		c.Error(response.ErrBadRequest(errors.New("invalid post id")))
		return
	}

	var updatedListing models.Listing

	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`UPDATE listings SET
		title = $1,
		description = $2,
		price = $3,
		quantity = $4,
		category_id = $5
		WHERE id = $6 AND seller_id = $7 
		RETURNING id, seller_id, title, description, price, quantity, category_id, created_on`,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.Quantity,
		listing.CategoryUUID,
		id,
		userID,
	).Scan(
		&updatedListing.UUID,
		&updatedListing.SellerUUID,
		&updatedListing.Title,
		&updatedListing.Description,
		&updatedListing.Price,
		&updatedListing.Quantity,
		&updatedListing.CategoryUUID,
		&updatedListing.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(errors.New("listing does not exist")))
			return
		}
		if pgErr, ok := err.(*pgconn.PgError); ok {
			switch pgErr.Code {
			case "23502":
				c.Error(response.ErrBadRequest(errors.New("db not null violation")))
				return
			case "23503":
				c.Error(response.ErrBadRequest(errors.New("foreign key violation")))
				return
			case "23514":
				c.Error(response.ErrBadRequest(errors.New("invalid data")))
				return
			}
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listing": updatedListing,
		"message": "updated listing",
	})
}
