package chatv2

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetChatHistory(c *gin.Context) {
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

	otherID := c.Param("otherID")
	listingID := c.Param("listingID")

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		id,
		sender_id,
		receiver_id,
		content,
		created_on
		FROM messages 
		WHERE listingID = $1
			AND ( (sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2)
		ORDER BY created_on ASC`,
		listingID, userIDStr, otherID,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	messages := make([]Mesage, 0)

	for rows.Next() {
		var m Mesage
		if err := rows.Scan(&m.ID, &m.SenderID, m.ReceiverID, m.Content, m.CreatedOn); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		messages = append(messages,m)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"messages": messages,
	})
}
