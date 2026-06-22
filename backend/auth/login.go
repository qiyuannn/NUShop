package auth

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(c *gin.Context) {
	var request LoginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	email := strings.ToLower(strings.TrimSpace(request.Email))
	if email == "" {
		c.Error(response.ErrBadRequest(errors.New("invalid email")))
		return
	}

	var user models.User
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT
			id,
			first_name,
			last_name,
			username,
			email,
			password_hash,
			created_on
		FROM users
		WHERE email = $1`,
		email,
	).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrUnauthorised(err))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(request.Password)); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"passwordVerified": true,
	})
}
