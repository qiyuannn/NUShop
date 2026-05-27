package categories

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetCategories(c *gin.Context) {
	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT uuid, name FROM categories ORDER BY name ASC`,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	categories := []models.Category{}

	for rows.Next() {
		var category models.Category

		if err := rows.Scan(&category.ID, &category.Name); err != nil {
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
