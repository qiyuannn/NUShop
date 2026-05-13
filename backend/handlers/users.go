package handlers

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

// sql error codes
// 23505 - unique
// 23503 - foreign key
// 23502 - not null

func CreateUser(c *gin.Context) {
	var request models.LoginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		response.Error(c, err, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Error(c, err, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
		return
	}

	_, err = db.Pool.Exec(
		c.Request.Context(),
		"INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
		request.Username, request.Email, hashedPassword,
	)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			if pgErr.Code == "23505" {
				response.Error(c, err, http.StatusConflict, "USERNAME_EXISTS", "username already exists")
				return 
			}
		}

		response.Error(c, err, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
		return
	}

	response.Success(c, http.StatusCreated, gin.H{
		"user": request.Username,
		"message": "user created",
	})
}

func Login(c *gin.Context) {
	var request models.LoginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		response.Error(c, err, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	var user models.User
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		"SELECT username, password_hash FROM users WHERE username = $1 ",
		request.Username,
	).Scan(&user.Username, &user.Password_hash); err != nil {
		response.Error(c, err, http.StatusUnauthorized, "UNAUTHORISED", "wrong username/password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password_hash), []byte(request.Password)); err != nil {
		response.Error(c, err, http.StatusUnauthorized, "UNAUTHORISED", "wrong username/password")
		return
	}

	token, err := GenerateJWT(user.Username)
	if err != nil {
		response.Error(c, err, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"user": user.Username,
		"token": token,
		"message": "login success",
	})
}

func GenerateJWT(username string) (string, error) {
	claims := jwt.MapClaims{
		"username": username,
		"exp": time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)

	return token.SignedString([]byte("austin so handsome"))
}

