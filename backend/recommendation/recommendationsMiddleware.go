package recommendation

import "github.com/gin-gonic/gin"


// middleware func for getListing and getListings
func RecommendationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		
		
		c.Next()
	}
}