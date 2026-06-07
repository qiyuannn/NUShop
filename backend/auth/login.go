package auth

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"os"
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
	ID      string `json:"uuid"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Email     string    `json:"email"`
	CreatedOn time.Time `json:"createdOn"`
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
		id, 
		first_name, 
		last_name, 
		email, 
		password_hash,
		created_on
		FROM users WHERE email = $1`,
		request.Email,
	).Scan(
		&user.ID,
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

	userID, err := uuid.Parse(user.ID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	token, err := GenerateAcessToken(userID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	refreshTokenID := uuid.NewString()
	refreshToken, err := GenerateRefreshToken(userID, refreshTokenID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if _, err := db.Pool.Exec(
		c.Request.Context(),
		`INSERT INTO refresh_tokens (
		id, user_id) VALUES ($1, $2)`,
		refreshTokenID, user.ID,
	); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	isProd := os.Getenv("ENV") == "production"

	cookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   isProd,
	}
	if isProd {
		cookie.SameSite = http.SameSiteNoneMode
	} else {
		cookie.SameSite = http.SameSiteLaxMode
	}

	http.SetCookie(c.Writer, cookie)

	resp := UserResponse{
		ID:      user.ID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		CreatedOn: user.CreatedOn,
	}

	response.Success(c, http.StatusOK, gin.H{
		"user":    resp,
		"token":   token,
	})
}
