package handlers

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ListingsQuery struct{
	SellerID uuid.UUID `form:"seller_id"`
	Search string `form:"search"`
	MinPrice int64 `form:"min_price" binding:"gte=0,ltefield=MaxPrice"`
	MaxPrice int64 `form:"max_price" binding:"gte=0,gtefield=MinPrice"` 
	Category string `form:"category"`
	Limit int `form:"limit,default=20" binding:"gte=1,lte=100"`

	CursorTime time.Time `form:"cursor_time"`
	CursorID uuid.UUID `form:"cursor_id"`
}

func getListings(c *gin.Context) {
	var query ListingsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.Error(response.ErrBadRequest(err))
		return 
	}

	conditions := []string{}
	args := []interface{}{}
	argsIndex := 1

	if query.SellerID != uuid.Nil {
		conditions = append(conditions, "seller_id = $" + strconv.Itoa(argsIndex))
		args = append(args, query.SellerID)
		argsIndex ++
	}

	if query.Search != "" {
		conditions = append(conditions, "title ILIKE $" + strconv.Itoa(argsIndex))
		args = append(args, "%" + query.Search + "%")
		argsIndex ++
	}
	if query.MinPrice > 0 {
		conditions = append(conditions, "price >= $" + strconv.Itoa(argsIndex))
		args = append(args, query.MinPrice)
		argsIndex ++
	}

	if query.MaxPrice != 0 {
		conditions = append(conditions, "price <= $" + strconv.Itoa(argsIndex))
		args = append(args, query.MaxPrice)
		argsIndex ++
	}

	if query.Category != "" {
		conditions = append(conditions, "category = $" + strconv.Itoa(argsIndex))
		args = append(args, query.Category)
		argsIndex ++
	}

	hasCursorTime := !query.CursorTime.IsZero()
	hasCursorID := query.CursorID != uuid.Nil
	if hasCursorID != hasCursorTime {
		c.Error(response.ErrBadRequest(errors.New("invalid cursor")))
		return
	}

	if !query.CursorTime.IsZero() && query.CursorID != uuid.Nil {
		conditions = append(conditions, "(created_on, id) < ($" + strconv.Itoa(argsIndex) + ",$" + strconv.Itoa(argsIndex + 1) + ")")
		args = append(args, query.CursorTime, query.CursorID)
		argsIndex += 2
	}
 	
	sqlQuery := "SELECT id, seller_id, title, description, price, quantity, category, created_on FROM listings"
	
	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}
	
	sqlQuery += " ORDER BY created_on DESC, id DESC"
	
	sqlQuery += " LIMIT " + strconv.Itoa(query.Limit + 1)

	rows, err := db.Pool.Query(
		c.Request.Context(),
		sqlQuery,
		args...,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return 
	}

	defer rows.Close()

	listings := []models.Listing{}

	for rows.Next() {
		var l models.Listing
		if err := rows.Scan(&l.ID, &l.Seller_id, &l.Title, &l.Description, &l.Price, &l.Quantity, &l.Category, &l.Created_on); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		listings = append(listings, l)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	var hasMore bool = len(listings) > query.Limit
	var meta response.Meta = response.Meta{
		HasMore: hasMore,
	}

	if hasMore {
		listings = listings[:query.Limit]
	}
	
	if len(listings) > 0 {
		last := listings[len(listings) - 1]
		meta.CursorID = last.ID
		meta.CursorTimeStamp = last.Created_on
	}

	c.JSON(http.StatusOK, response.Response{
		Data: listings,
		Meta: &meta,
	})
}