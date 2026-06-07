package listings

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

//On delete cascade will delete image pointers in images

func DeleteListing(c *gin.Context) {
	userIDValue, ok := c.Get("userID")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}

	userID, ok := userIDValue.(string)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	listingID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	var deletedID uuid.UUID
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`DELETE FROM listings WHERE id = $1 AND seller_id = $2 RETURNING id`,
		listingID,
		userID,
	).Scan(&deletedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(err))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listing_id": listingID,
	})
}