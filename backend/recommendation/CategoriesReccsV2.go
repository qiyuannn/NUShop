package recommendation

import (
	db "backend/database"
	"backend/response"

	"github.com/gin-gonic/gin"
)

func CategoriesReccs(c *gin.Context) {
	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT name 
		FROM categories`,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()
	
	categories := []string{}

	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		categories = append(categories, cat)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	

}