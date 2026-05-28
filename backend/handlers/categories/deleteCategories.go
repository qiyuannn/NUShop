package categories

import(
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func DeleteCategory(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.Error(response.ErrBadRequest(errors.New("invalid category id")))
		return
	}

	result, err := db.Pool.Exec(
		c.Request.Context(),
		`DELETE FROM categories WHERE id = $1`,
		id,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if result.RowsAffected() == 0 {
		c.Error(response.ErrNotFound(errors.New("category not found")))
		return
	}

	c.Status(http.StatusNoContent)
}