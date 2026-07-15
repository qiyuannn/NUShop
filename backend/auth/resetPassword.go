package auth

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type ResetPasswordRequest struct {
	ResetToken string `json:"resetToken"`
	Password   string `json:"password"`
}

func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	password := req.Password
	if len(password) < 8 {
		c.Error(response.ErrBadRequest(errors.New("password must be at least 8 characters")))
		return
	}

	hasUpper := false
	hasLower := false
	hasNumber := false

	for _, ch := range password {
		switch {
		case ch >= 'A' && ch <= 'Z':
			hasUpper = true
		case ch >= 'a' && ch <= 'z':
			hasLower = true
		case ch >= '0' && ch <= '9':
			hasNumber = true
		}
	}

	if !hasUpper || !hasLower || !hasNumber {
		c.Error(response.ErrBadRequest(errors.New(
			"password must contain at least one uppercase letter, one lowercase letter and one number",
		)))
		return
	}

	resetSecret := os.Getenv("ResetTokenSecret")
	if resetSecret == "" {
		resetSecret = os.Getenv("AccessTokenSecret")
	}
	if resetSecret == "" {
		c.Error(response.ErrInternalServerError(errors.New("Reset token secret not set")))
		return
	}

	token, err := jwt.ParseWithClaims(
		req.ResetToken,
		&jwt.RegisteredClaims{},
		func(token *jwt.Token) (any, error) {
			return []byte(resetSecret), nil
		},
	)
	if err != nil || !token.Valid {
		c.Error(response.ErrUnauthorised(errors.New("Invalid reset token")))
		return
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("Invalid reset token")))
		return
	}

	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		c.Error(response.ErrUnauthorised(errors.New("Reset token expired")))
		return
	}

	email := strings.ToLower(strings.TrimSpace(claims.Subject))
	if email == "" {
		c.Error(response.ErrUnauthorised(errors.New("Invalid reset token")))
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	var userID string
	err = db.Pool.QueryRow(
		c.Request.Context(),
		`UPDATE users
		 SET password_hash = $2
		 WHERE email = $1
		 RETURNING id`,
		email,
		string(passwordHash),
	).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(errors.New("Account not found")))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	_, _ = db.Pool.Exec(
		c.Request.Context(),
		`DELETE FROM refresh_tokens WHERE user_id = $1`,
		userID,
	)

	_, _ = db.Pool.Exec(
		c.Request.Context(),
		`DELETE FROM email_login_codes WHERE email = $1`,
		email,
	)

	if err := sendPasswordChangedEmail(email); err != nil {
		fmt.Println("Failed to send password change notification:", err)
	}

	response.Success(c, http.StatusOK, gin.H{
		"message": "password reset successful",
	})
}