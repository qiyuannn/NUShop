package auth

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func Logout(c *gin.Context){
	rTokenStr, err := c.Cookie("refresh_token")
	if err!= nil {
		response.Success(c, http.StatusOK, gin.H{
			"message": "refresh token expired",
		})
	}

	claims := &jwt.RegisteredClaims{}
	secret := os.Getenv("RefreshTokenSecret")

	_, err = jwt.ParseWithClaims(
		rTokenStr,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("invalid token")
			}
			return []byte(secret), nil
		},
		jwt.WithExpirationRequired(),
		jwt.WithIssuer("NUShop"),
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(),
	) 
	if err != nil {
		c.Error(response.ErrInternalServerError(err))

		http.SetCookie(c.Writer, &http.Cookie{
			Name: "refresh_token",
			Path: "/",
			Expires: time.Unix(0,0),
			MaxAge: -1,
		})
		return
	}

	tokenUUID := claims.ID

	if res, err := db.Pool.Exec(
		c.Request.Context(),
		`UPDATE refresh_tokens SET
		revoked_at = $1
		WHERE uuid = $2`,
		time.Now(), tokenUUID,
	); err != nil || res.RowsAffected() != 1 {
		c.Error(response.ErrInternalServerError(err))
		http.SetCookie(c.Writer, &http.Cookie{
			Name: "refresh_token",
			Path: "/",
			Expires: time.Unix(0,0),
			MaxAge: -1,
		})
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name: "refresh_token",
		Path: "/",
		Expires: time.Unix(0,0),
		MaxAge: -1,
	})
	response.Success(c, http.StatusOK, gin.H{
		"mesage": "refresh token deleted",
	})
}