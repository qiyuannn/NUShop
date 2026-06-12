package chat

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetMessages(c *gin.Context) {
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

	var otherID = c.Param("userID")

	if _, err := uuid.Parse(otherID); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		id,
		sender_id,
		receiver_id, 
		content,
		read, 
		created_on
		FROM messages 
		WHERE (sender_id = $1 AND receiver_id = $2)
			OR (receiver_id = $1 AND sender_id = $2)
		ORDER BY created_on ASC`,
		userIDStr, otherID,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	messages := make([]models.Message, 0)
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &m.Read, &m.CreatedOn); err!= nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		messages = append(messages, m)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if _, err := db.Pool.Exec(
		c.Request.Context(),
		`UPDATE messages 
		SET read = TRUE
		WHERE sender_id = $1 AND receiver_id = $2 AND read = FALSE`,
		otherID, userIDStr,
	); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"messages": messages,
	})
}