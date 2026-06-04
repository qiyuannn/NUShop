package categories

import (
	db "backend/database"
	"backend/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetCategories(c *gin.Context) {
	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT name FROM categories ORDER BY name ASC`,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	categories := []string{}

	for rows.Next() {
		var category string

		if err := rows.Scan(&category); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		categories = append(categories, category)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"categories": categories,
	})
}
