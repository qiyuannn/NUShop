package auth

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type VerifyEmailCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

func VerifyEmailCode(c *gin.Context) {
	var req VerifyEmailCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		c.Error(response.ErrBadRequest(errors.New("invalid email")))
		return
	}

	var codeHash string
	var expiresAt time.Time

	err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT code_hash, expires_at
		 FROM email_login_codes
		 WHERE email = $1
		 LIMIT 1`,
		email,
	).Scan(&codeHash, &expiresAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrUnauthorised(errors.New("code not found")))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if time.Now().After(expiresAt) {
		c.Error(response.ErrUnauthorised(errors.New("code expired")))
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(codeHash), []byte(req.Code)); err != nil {
		c.Error(response.ErrUnauthorised(errors.New("invalid code")))
		return
	}

	signupSecret := os.Getenv("SignupTokenSecret")
	if signupSecret == "" {
		signupSecret = os.Getenv("AccessTokenSecret")
	}
	if signupSecret == "" {
		c.Error(response.ErrInternalServerError(errors.New("signup token secret not set")))
		return
	}

	claims := jwt.RegisteredClaims{
		Issuer:    "NUShop",
		Subject:   email,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(10 * time.Minute)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ID:        uuid.NewString(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	verificationToken, err := token.SignedString([]byte(signupSecret))
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"verificationToken": verificationToken,
	})
}
