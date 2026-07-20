package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func SearchAbsentHelperV2(
	c *gin.Context,
	conditions []string,
	args []interface{},
	argsIndex int,
	limit int,
	cursorScore *float64,
	cursorID *string, 
	cursorSeed *string,
	sellerID string,
) ([]models.Listing, *response.Cursor) {

	seedExists := cursorSeed != nil 
	scoreExists := cursorScore != nil
	idExists := cursorID != nil
	if (!(seedExists && scoreExists && idExists)) {
		if (!(!seedExists && !scoreExists && !idExists)) {
			c.Error(response.ErrInternalServerError(errors.New("invalid cursor")))
			return nil, nil
		} 
	}

	if cursorSeed == nil {
		seed := uuid.New().String()
		cursorSeed = &seed
	}

	sqlQuery := 
	` SELECT
		id, 
		seller_id,
		title,
		description,
		price,
		quantity,
		condition,
		category_name,
		created_on
	FROM listings`

	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	subQuery :=
	` SELECT 
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
			0.25 * EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - l.created_on)) / (7 * 86400.0)) + $` + strconv.Itoa(argsIndex) + ` * ((hashtext(l.id::text || $` + strconv.Itoa(argsIndex + 1) +`)::float8 / 2147483647.0 + 1) / 2)
		) AS score
		FROM (` +  sqlQuery +`) l
		LEFT JOIN listing_popularity p
			ON p.id = l.id
		`

	if sellerID != "" {
		args = append(args, 0)
	} else {
		args = append(args, 0.5)
	}

	args = append(args, cursorSeed)
	argsIndex += 2

	finalQuery := 
	` SELECT * FROM (` + subQuery +`) sub `
	
	if seedExists && scoreExists && idExists {
		finalQuery += `WHERE (sub.score, sub.id) < ($`+ strconv.Itoa(argsIndex) +`, $` + strconv.Itoa(argsIndex + 1)+ `) `
		args = append(args, cursorScore, cursorID)
	}
	finalQuery += `ORDER BY sub.score DESC, sub.id DESC LIMIT ` + strconv.Itoa(limit + 1)
		 
	rows, err := db.Pool.Query(c.Request.Context(), finalQuery, args...)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return nil, nil
	}
	defer rows.Close()

	listings := []models.Listing{}

	for rows.Next() {
		var l models.Listing
		if err := rows.Scan(
			&l.ID,
			&l.SellerID,
			&l.Title,
			&l.Description,
			&l.Price,
			&l.Quantity,
			&l.Condition,
			&l.CategoryName,
			&l.CreatedOn,
			&l.Score,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return nil, nil
		}
		listings = append(listings, l)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return nil, nil
	}

	hasMore := len(listings) > limit
	cursor := response.Cursor{HasMore: hasMore}

	if hasMore {
		listings = listings[:limit]
	}

	if len(listings) > 0 {
		last := listings[len(listings)-1]
		cursor.CursorID = &last.ID
		cursor.CursorScore = last.Score
		cursor.CursorSeed = cursorSeed
	}

	return listings, &cursor
}