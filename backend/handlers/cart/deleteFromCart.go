package cart

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)



type DeleteFromCartRequest struct {
	ListingID string `json:"listingID"`
}

func DeleteFromCart(c *gin.Context) {
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
	if _, err := uuid.Parse(userIDStr); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	var deleteFromCartRequest DeleteFromCartRequest
	if err := c.ShouldBindJSON(&deleteFromCartRequest); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	var deletedID string 
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`DELETE FROM cart 
		WHERE user_id = $1 and listing_id = $2
		RETURNING listing_id`,
		userIDStr, deleteFromCartRequest.ListingID,
	).Scan(&deletedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrBadRequest(err))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"message": "deleted from cart",
	})
}