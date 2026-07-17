package recommendation

import (
	db "backend/database"
	"backend/handlers/listings"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ExploreListingsRequest struct {
	seed *string
	score *float64
	id *string
}

func ExploreListings(c *gin.Context) {
	time.Sleep(time.Second * 1)

	var req ExploreListingsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	seedExists := req.seed != nil 
	scoreExists := req.score != nil
	idExists := req.id != nil

	if (!(seedExists && scoreExists && idExists)) {
		if (!(!seedExists && !scoreExists && !idExists)) {
			c.Error(response.ErrInternalServerError(errors.New("invalid cursor")))
			return
		} 
	}

	args := []interface{}{}

	if !seedExists {
		seed := uuid.New().String()
		req.seed = &seed
		args = append(args, req.seed)
	}	else {
		args = append(args, req.seed)
	}

	sqlQuery :=
	`SELECT 
		l.id,
		l.seller_id,
		l.title,
		l.description,
		l.price,
		l.quantity,
		l.condition,
		l.category_name,
		l.created_on,
		( 0.25 * COALESCE(p.score, 0) +
			0.25 * EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - l.created_on)) / (7 * 86400.0)) + 
			0.5 * ((hashtext(l.id::text || $1)::float8 / 2147483647.0 + 1) / 2)
		) AS score
	FROM LISTINGS l
	LEFT JOIN listing_popularity p
		ON p.id = l.id`

	finalQuery := `SELECT * FROM (` + sqlQuery + `) sub `
	if seedExists && scoreExists && idExists {
		finalQuery += `WHERE (score, id) < ($3, $4) `
		args = append(args, req.score, req.id)
	}
	finalQuery += `ORDER BY score DESC, id DESC LIMIT 21`

	rows, err := db.Pool.Query(
		c.Request.Context(),
		finalQuery,
		args...,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	l := []models.Listing{}

	for rows.Next() {
		var temp models.Listing
		if err := rows.Scan(
			&temp.ID,
			&temp.SellerID,
			&temp.Title,
			&temp.Description,
			&temp.Price,
			&temp.Quantity,
			&temp.Condition,
			&temp.CategoryName,
			&temp.CreatedOn,
			&temp.Score,
		); err != nil{
			c.Error(response.ErrInternalServerError(err))
			return
		}
		l = append(l, temp)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	hasMore := len(l) > 20
	cursor := response.Cursor{HasMore: hasMore}

	if hasMore {
		l = l[:20]
		last := l[len(l)-1]
		cursor.CursorID = &last.ID
		cursor.CursorScore = last.Score
		cursor.Seed = req.seed
	}

	l, err = listings.GetImagesHelper(c, l)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": l,
		"cursor": cursor,
	})
}
//popularity/recency/random
// explore 25%/25%/50%
// personalisation 