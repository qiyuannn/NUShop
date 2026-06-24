package chatv2

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type chat struct {
	ListingID string `json:"listingID"`
	Content string `json:"content"`
	Created_On time.Time `json:"createdOn"`
	Username string `json:"otherName"`
	OtherID string `json:"otherID"`
	Image *string `json:"image"`
	Title string `json:"title"`
}

func GetChats(c *gin.Context) {
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

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT * FROM 
			(SELECT DISTINCT ON (m.listing_id, u.id)
				m.listing_id, 
				m.content,
				m.created_on,
				u.username,
				u.id,
				i.file_url,
				l.title
			FROM messages m
			JOIN users u
				ON u.id = CASE
					WHEN m.sender_id = $1 THEN m.receiver_id
					WHEN m.receiver_id = $1 THEN m.sender_id
				END
			LEFT JOIN images i
				ON i.listing_id = m.listing_id
			JOIN listings l
				ON l.id = m.listing_id
			ORDER BY m.listing_id, u.id) _
		ORDER BY created_on DESC`,
		userIDStr,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	chats := make([]chat, 0)

	for rows.Next() {
		var ch chat
		if err := rows.Scan(&ch.ListingID, &ch.Content, &ch.Created_On, &ch.Username, &ch.OtherID, &ch.Image, &ch.Title); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		chats = append(chats, ch)
	}

	if err := rows.Err(); err != nil  {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"chats": chats,
	})
}
