package listings

import (
	db "backend/database"
	"backend/response"
	"log"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func SearchAbsentHelper(
	c *gin.Context,
	conditions []string, 
	args []interface{},
	limit int,
) ([]searchListing, *response.Cursor) {
	log.Print("Normal Query ran")
	sqlQuery :=
		`
		SELECT
			id,
			seller_id,
			title,
			description,
			price,
			quantity,
			condition,
			category_name,
			created_on
		FROM listings
	`

	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	sqlQuery += " ORDER BY created_on DESC, id DESC"
	sqlQuery += " LIMIT " + strconv.Itoa(limit+1)

	rows, err := db.Pool.Query(c.Request.Context(), sqlQuery, args...)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return nil, nil
	}

	defer rows.Close()

	listings := []searchListing{}

	for rows.Next() {
		var l searchListing
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
		cursor.CursorTime = &last.CreatedOn
	}

	return listings, &cursor
}
