// handlers for all account related stuff
package handlers

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

// sql error codes
// 23505 - unique
// 23503 - foreign key
// 23502 - not null

type LoginRequest struct {
	Email string `json:"email"`
	Password string `json:"password"`
}

type AccountCreationRequest struct {
	FirstName string `json:"firstName"`
	LastName string `json:"lastName"`
	Email string `json:"email" binding:"email"`
	Password string `json:"password"`
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
		uuid,
		first_name,
		last_name,
		email,
		created_on
		`,
		request.FirstName,
		request.LastName,
		request.Email,
		hashedPassword,
	).Scan(
		&user.UUID,
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
					c.Error(response.ErrStatusConflict(errors.New("email alr in use")))
			}
			return
		} 
		c.Error(response.ErrInternalServerError(err))
		return
		}

	response.Success(c, http.StatusCreated, gin.H{
		"message": "user created",
	})
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
		log.Fatal("here")
		c.Error(response.ErrInternalServerError(err))
		return 
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(request.Password)); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	token, err := GenerateJWT(user.UUID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	} 

	response.Success(c, http.StatusOK, gin.H{
		"token": token,
		"message": "login success",
	})
}

func GenerateJWT(userID uuid.UUID) (string, error) {
	secret := os.Getenv("secret")

	claims := jwt.RegisteredClaims{
		Issuer: "NUShop",
		Subject: userID.String(),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 72)),
		IssuedAt: jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secret))
}

