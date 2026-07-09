package auth

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func OptionalAuthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")

		if ok := strings.HasPrefix(header, "Bearer"); ok {
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			if tokenStr != "" {
				claims, err := VerifyToken(tokenStr)
				if err == nil {
					c.Set("userID", claims.Subject)
				}
			}
		}

		c.Next()
	}
}