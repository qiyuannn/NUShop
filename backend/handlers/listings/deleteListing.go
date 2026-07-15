package listings

import (
	"backend/cloudinary"
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

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
	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT i.public_id
                 FROM images i
                 JOIN listings l ON l.id = i.listing_id
                 WHERE i.listing_id = $1 AND l.seller_id = $2`,
		listingID,
		userID,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer rows.Close()
	publicIDs := []string{}
	for rows.Next() {
		var publicID *string
		if err := rows.Scan(&publicID); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		if publicID != nil && *publicID != "" {
			publicIDs = append(publicIDs, *publicID)
		}
	}
	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	for _, publicID := range publicIDs {
		if err := cloudinary.DeleteImage(publicID); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
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
