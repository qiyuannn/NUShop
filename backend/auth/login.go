package auth

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserResponse struct {
	UUID      string `json:"uuid"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Email     string    `json:"email"`
	CreatedOn time.Time `json:"createdOn"`
	Token     string    `json:"token"`
}

func Login(c *gin.Context) {
	var request LoginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	var user models.User
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT 
		uuid, 
		first_name, 
		last_name, 
		email, 
		password_hash,
		created_on
		FROM users WHERE email = $1`,
		request.Email,
	).Scan(
		&user.UUID,
		&user.FirstName,
		&user.LastName,
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

	userUUID, err := uuid.Parse(user.UUID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
	}

	token, err := GenerateAcessToken(userUUID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	refreshTokenUUID := uuid.NewString()
	refreshToken, err := GenerateRefreshToken(userUUID, refreshTokenUUID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if _, err := db.Pool.Exec(
		c.Request.Context(),
		`INSERT INTO refresh_tokens (
		uuid, user_uuid) VALUES ($1, $2)`,
		refreshTokenUUID, user.UUID,
	); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	resp := UserResponse{
		UUID:      user.UUID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		CreatedOn: user.CreatedOn,
	}

	response.Success(c, http.StatusOK, gin.H{
		"user":    resp,
		"token":   token,
		"message": "login success",
	})
}
