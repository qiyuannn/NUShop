package categories

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func UpdateCategory(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.Error(response.ErrBadRequest(errors.New("invalid category id")))
		return
	}

	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(response.ErrBadRequest(errors.New("invalid JSON body")))
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.Error(response.ErrBadRequest(errors.New("name is required")))
		return
	}

	var category models.Category
	err = db.Pool.QueryRow(
		c.Request.Context(),
		`UPDATE categories
	 SET name = $1
	 WHERE id = $2
	 RETURNING id, name`,
		req.Name,
		id,
	).Scan(&category.ID, &category.Name)

	if err != nil {
		c.Error(response.ErrNotFound(errors.New("category not found")))
		return
	}

	c.JSON(http.StatusOK, response.Response{
		Data: category,
	})
}