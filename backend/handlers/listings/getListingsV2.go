package listings

import (
	db "backend/database"
	"backend/response"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type getListingsV2Query struct {
	SellerID string `form:"seller_id"`
	Search   string    `form:"search"`
	MinPrice int64     `form:"min_price" binding:"gte=0,ltefield=MaxPrice"`
	MaxPrice int64     `form:"max_price" binding:"gte=0,gtefield=MinPrice"`
	Category string    `form:"category"`
	Condition []string `form:"condition" collection_format:"multi"`
	Limit    int       `form:"limit,default=20" binding:"gte=1,lte=100"`

	CursorRank *float64 `form:"cursorRank"`
	CursorID *string `form:"cursorID"`
}

type searchListing struct {
	ID         string `json:"id"`
	SellerID   string `json:"sellerID"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Price        int64     `json:"price" binding:"gte=0"`
	Quantity     int64     `json:"quantity" binding:"gte=0"`
	Condition    string    `json:"condition"`
	CategoryName string `json:"categoryName"`
	CreatedOn    time.Time `json:"createdOn"`
	Images       []string  `json:"images"`

	Rank float64
}

func GetListingsV2(c *gin.Context) { //multiple
	var query getListingsV2Query
	if err := c.ShouldBindQuery(&query); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	if query.Search == "" {
		c.Error(response.ErrBadRequest(errors.New("Search field is missing. Wrong getListings handler called")))
		return
	}

	if query.SellerID != "" {
		_, err := uuid.Parse(query.SellerID)
		if err != nil {
			c.Error(response.ErrBadRequest(err))
			return
		}
	}

	if c.FullPath() == "/listings/manage/search" {
		userIDValue, ok := c.Get("userID")
		if !ok {
			c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
			return
		}

		userIDStr, ok := userIDValue.(string)
		if !ok {
			c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
			return
		}

		_, err := uuid.Parse(userIDStr)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		query.SellerID = userIDStr
	}

	conditions := []string{}
	args := []interface{}{}
	argsIndex := 2

	conditions = append(conditions, "search_vector @@ websearch_to_tsquery('english', $1)")
	args = append(args, query.Search)

	if query.SellerID != "" {
		conditions = append(conditions, "seller_id = $"+strconv.Itoa(argsIndex))
		args = append(args, query.SellerID)
		argsIndex++
	}

	if query.MinPrice > 0 {
		conditions = append(conditions, "price >= $"+strconv.Itoa(argsIndex))
		args = append(args, query.MinPrice)
		argsIndex++
	}

	if query.MaxPrice != 0 {
		conditions = append(conditions, "price <= $"+strconv.Itoa(argsIndex))
		args = append(args, query.MaxPrice)
		argsIndex++
	}

	if query.Category != "" {
		conditions = append(conditions, "category_name = $"+strconv.Itoa(argsIndex))
		args = append(args, query.Category)
		argsIndex++
	}

	if len(query.Condition) > 0 {
		conditions = append(conditions, "condition = ANY($" + strconv.Itoa(argsIndex) + ")")
		args = append(args, query.Condition)
		argsIndex ++
	}

	sqlQuery := `
	SELECT
	id,
	seller_id,
	title,
	description,
	price,
	quantity,
	condition,
	category_name,
	created_on,
	ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
	FROM listings
	`
	
	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}
	
	finalQuery := `SELECT * FROM (` + sqlQuery + `) ranked`
	
	hasCursorRank := query.CursorRank != nil
	hasCursorID := query.CursorID != nil
	if hasCursorID != hasCursorRank {
		c.Error(response.ErrBadRequest(errors.New("invalid cursor")))
		return
	}

	if hasCursorID && hasCursorRank {
		finalQuery += " WHERE (rank, id) < ($" + strconv.Itoa(argsIndex)+ ",$" + strconv.Itoa(argsIndex+1) + ")"
		args = append(args, *query.CursorRank, *query.CursorID)
		argsIndex += 2
	}
	
	finalQuery += " ORDER BY ranked.rank DESC, ranked.id DESC"
	finalQuery += " LIMIT " + strconv.Itoa(query.Limit+1)
	
	rows, err := db.Pool.Query(c.Request.Context(), finalQuery, args...)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
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
			&l.Rank,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		listings = append(listings, l)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	ids := make([]string, 0, len(listings))
	for _, l := range listings {
		ids = append(ids, l.ID)
	}

	imageMap := map[string][]string{}

	if len(ids) > 0 {
		placeholders := make([]string, len(ids))
		args := make([]any, len(ids))
		for i, id := range ids {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = id
		}

		imageRows, err := db.Pool.Query(
			c.Request.Context(),
			`SELECT listing_id, file_url
		 FROM images
		 WHERE listing_id IN (`+strings.Join(placeholders, ",")+`)`,
			args...,
		)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		defer imageRows.Close()

		for imageRows.Next() {
			var listingID string
			var fileURL string
			if err := imageRows.Scan(&listingID, &fileURL); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return
			}
			imageMap[listingID] = append(imageMap[listingID], fileURL)
		}
	}

	for i := range listings {
		listings[i].Images = imageMap[listings[i].ID]
	}

	hasMore := len(listings) > query.Limit
	cursor := response.Cursor{HasMore: hasMore}

	log.Print(cursor)

	if hasMore {
		listings = listings[:query.Limit]
	}

	if len(listings) > 0 {
		last := listings[len(listings)-1]
		cursor.CursorID = last.ID
		cursor.CursorRank = last.Rank
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": listings,
		"cursor": cursor,
	})
}
