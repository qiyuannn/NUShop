package chat

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetConversations(c * gin.Context) {
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
		`SELECT receiver_id FROM messages
		WHERE sender_id = $1 OR receiver_id = $1
		ORDERED BY created_on ASC`,
		userIDStr,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return 
	}

	defer rows.Close()

	var users []string

	for rows.Next() {
		var u string 
		if err := rows.Scan(&u); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		users = append(users, u)
	}

	response.Success(c, http.StatusOK, gin.H{
		"users": users,
	})
}