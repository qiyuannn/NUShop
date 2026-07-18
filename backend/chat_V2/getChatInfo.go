package chatv2

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func GetChatInfo(c *gin.Context) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}

	userIDStr, ok := userIDVal.(string)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	if _, err := uuid.Parse(userIDStr); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	listingID := c.Param("listingID")
	if _, err := uuid.Parse(listingID); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	id1 := c.Param("id1")
	if _, err := uuid.Parse(id1); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	id2 := c.Param("id2")

	var otherUserID string
	if id2 == "" {
		otherUserID = id1
	} else {
		if _, err := uuid.Parse(id2); err != nil {
			c.Error(response.ErrBadRequest(err))
			return
		}

		if userIDStr != id1 && userIDStr != id2 {
			c.Error(response.ErrUnauthorised(errors.New("not a participant in this chat")))
			return
		}
		otherUserID = id2
		if userIDStr == id2 {
			otherUserID = id1
		}
	}

	if otherUserID == userIDStr {
		c.Error(response.ErrBadRequest(errors.New("cannot chat with yourself")))
		return
	}

	var title string
	var username string
	var image *string
	var id string
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT 
		l.title,
		u.username,
		u.id,
		i.file_url
		FROM listings l
		JOIN users u 
			ON u.id = $2
		LEFT JOIN images i
			ON i.listing_id = l.id
		WHERE l.id = $1
		LIMIT 1`,
		listingID, otherUserID,
	).Scan(&title, &username, &id, &image); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrBadRequest(err))
			return
		}

		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"title":     title,
		"otherName": username,
		"otherID":   id,
		"image":     image,
	})
}
