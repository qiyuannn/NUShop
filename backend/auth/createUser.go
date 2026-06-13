package auth

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type AccountCreationRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email" binding:"email"`
	Password  string `json:"password"`
}

func CreateUser(c *gin.Context) {
	var request AccountCreationRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	var user models.User
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`INSERT INTO users (
			first_name,
			last_name,
			email,
			password_hash
		) VALUES ($1, $2, $3, $4) RETURNING
			id,
			first_name,
			last_name,
			email,
			created_on`,
		request.FirstName,
		request.LastName,
		request.Email,
		hashedPassword,
	).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.CreatedOn,
	); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			switch pgErr.Code {
			case "23502":
				c.Error(response.ErrBadRequest(errors.New("db not null violation")))
				return
			case "23503":
				c.Error(response.ErrBadRequest(errors.New("foreign key violation")))
				return
			case "23514":
				c.Error(response.ErrBadRequest(errors.New("invalid data")))
				return
			case "23505":
				c.Error(response.ErrStatusConflict(errors.New("email already in use")))
				return
			}
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	userID, err := uuid.Parse(user.ID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	token, err := GenerateAccessToken(userID)
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
		`INSERT INTO refresh_tokens (id, user_id) VALUES ($1, $2)`,
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

	response.Success(c, http.StatusCreated, gin.H{
		"user":  user,
		"token": token,
	})
}