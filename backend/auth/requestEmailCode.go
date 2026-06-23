package auth

import (
	db "backend/database"
	"backend/response"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type RequestEmailCodeRequest struct {
	Email string `json:"email"`
	Flow  string `json:"flow"`
}

func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func RequestEmailCode(c *gin.Context) {
	var req RequestEmailCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		c.Error(response.ErrBadRequest(errors.New("Invalid email")))
		return
	}

	var existingUserID string
	err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT id
	 FROM users
	 WHERE email = $1
	 LIMIT 1`,
		email,
	).Scan(&existingUserID)

	flow := strings.ToLower(strings.TrimSpace(req.Flow))
	if flow != "login" && flow != "signup" {
		c.Error(response.ErrBadRequest(errors.New("Invalid flow")))
		return
	}

	userExists := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if flow == "signup" && userExists {
		c.Error(response.ErrBadRequest(errors.New("An account with this email already exists. Please log in instead.")))
		return
	}

	if flow == "login" && !userExists {
		c.Error(response.ErrBadRequest(errors.New("Account not found. Please sign up instead.")))
		return
	}
	code, err := generateCode()
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	_, err = db.Pool.Exec(
		c.Request.Context(),
		`INSERT INTO email_login_codes (id, email, code_hash, expires_at)
		 VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
		 ON CONFLICT (email)
		 DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at`,
		uuid.New(),
		email,
		string(hash),
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if err := sendEmailCode(email, code); err != nil {
		c.Error(response.ErrInternalServerError(errors.New("Could not send verification code right now. Please try again later.")))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"message": "code sent",
	})
}
