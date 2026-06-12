package chat

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Conversation struct{
	ChatID string `json:"chatID"`
	FirstName string `json:"firstName"`
	LastName string `json:"lastName"`
	LastMessage string `json:"lastMessage"`
	LastMessageSender string `json:"lastMessageSender"`
	LastMessageOn time.Time `json:"lastMessageOn"`
	Read bool `json:"read"`
}

func GetConversations(c *gin.Context) {
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
		`SELECT DISTINCT ON (u.id)
		u.id,
		u.first_name,
		u.last_name,
		m.content,
		m.sender_id,
		m.created_on,
		m.read
		FROM messages m
		JOIN users u
		ON u.id = CASE
		WHEN m.sender_id = $1 THEN m.receiver_id
		WHEN m.receiver_id = $1 THEN m.sender_id
		END
		ORDER BY u.id, m.created_on DESC`,
		userIDStr,
	)
	
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	
	defer rows.Close()
	
	conversations := make([]Conversation, 0)
	for rows.Next() {
		var conv Conversation
		if err := rows.Scan(&conv.ChatID, &conv.FirstName, &conv.LastName, &conv.LastMessage, &conv.LastMessageSender, &conv.LastMessageOn, &conv.Read); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		conversations = append(conversations, conv)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"conversations": conversations,
	})
}