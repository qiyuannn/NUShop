package users

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func GetUser(c *gin.Context) {
	userUUID := c.Param("userID")

	var user models.User
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT id, username, email, created_on
	 FROM users
	 WHERE id = $1`,
		userUUID,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrBadRequest(err))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"user":    user,
		"message": "user getfetched",
	})
}
