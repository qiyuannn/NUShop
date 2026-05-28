package categories
import(
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type CategoryRequest struct {
	Name string `json:"name"`
}

func CreateCategory(c *gin.Context) {
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

	err := db.Pool.QueryRow(
		c.Request.Context(),
		`INSERT INTO categories (name) VALUES ($1) RETURNING id, name`,
		req.Name,
	).Scan(&category.ID, &category.Name)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Data: category,
	})
}