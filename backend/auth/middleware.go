package auth

import (
	"backend/response"
	"errors"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")

		if ok := strings.HasPrefix(header, "Bearer"); !ok {
			c.Error(response.ErrUnauthorised(errors.New("wrong header format")))
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		if tokenStr == "" {
			c.Error(response.ErrUnauthorised(errors.New("token missing")))
			c.Abort()
			return
		}

		claims, err := verifyToken(tokenStr)
		if err != nil {
			c.Error(response.ErrUnauthorised(err))
			c.Abort()
			return
		}

		c.Set("userID", claims.Subject)

		c.Next()
	}
}

func verifyToken(tokenStr string) (*jwt.RegisteredClaims, error) {
	secret := os.Getenv("AccessTokenSecret")


	claims := &jwt.RegisteredClaims{}

	token, err := jwt.ParseWithClaims(
		tokenStr,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("invalid token")
			}
			return []byte(secret), nil
		},
		jwt.WithExpirationRequired(),
		jwt.WithIssuer("Shop"),
		jwt.WithIssuedAt(),
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
	)

	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
