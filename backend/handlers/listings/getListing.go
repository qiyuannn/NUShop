package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type getListingsQuery struct {
	SellerID uuid.UUID `form:"seller_id"`
	Search   string    `form:"search"`
	MinPrice int64     `form:"min_price" binding:"gte=0,ltefield=MaxPrice"`
	MaxPrice int64     `form:"max_price" binding:"gte=0,gtefield=MinPrice"`
	Category string    `form:"category"`
	Limit    int       `form:"limit,default=20" binding:"gte=1,lte=100"`

	CursorTime time.Time `form:"cursor_time"`
	CursorID   uuid.UUID `form:"cursor_id"`
}

func GetListing(c *gin.Context) { //single
	param := c.Param("listingID")

	var listing models.Listing
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT 
		uuid,
		seller_uuid,
		title,
		description,
		price,
		quantity,
		condition,
		category_uuid,
		created_on
		FROM listings WHERE uuid=$1`,
		param,
	).Scan(
		&listing.UUID,
		&listing.SellerUUID,
		&listing.Title,
		&listing.Description,
		&listing.Price,
		&listing.Quantity,
		&listing.Condition,
		&listing.CategoryUUID,
		&listing.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(err))
			return
		}
		fmt.Print(err)
		c.Error(response.ErrInternalServerError(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		file_url
		FROM images
		WHERE listing_uuid = $1`,
		param,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer rows.Close()

	images := []string{}
	for rows.Next() {
		var image_url string
		if err := rows.Scan(&image_url); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		images = append(images, image_url)
	}
	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	listing.Images = images

	response.Success(c, http.StatusOK, gin.H{
		"listing": listing,
		"message": "listing fetch successful",
	})
}

func GetListings(c *gin.Context) { // multiple
	var query getListingsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	conditions := []string{}
	args := []interface{}{}
	argsIndex := 1

	if query.SellerID != uuid.Nil {
		conditions = append(conditions, "seller_id = $"+strconv.Itoa(argsIndex))
		args = append(args, query.SellerID)
		argsIndex++
	}

	if query.Search != "" {
		conditions = append(conditions, "title ILIKE $"+strconv.Itoa(argsIndex))
		args = append(args, "%"+query.Search+"%")
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
		conditions = append(conditions, "category = $"+strconv.Itoa(argsIndex))
		args = append(args, query.Category)
		argsIndex++
	}

	hasCursorTime := !query.CursorTime.IsZero()
	hasCursorID := query.CursorID != uuid.Nil
	if hasCursorID != hasCursorTime {
		c.Error(response.ErrBadRequest(errors.New("invalid cursor")))
		return
	}

	if !query.CursorTime.IsZero() && query.CursorID != uuid.Nil {
		conditions = append(conditions, "(created_on, id) < ($"+strconv.Itoa(argsIndex)+",$"+strconv.Itoa(argsIndex+1)+")")
		args = append(args, query.CursorTime, query.CursorID)
		argsIndex += 2
	}

	sqlQuery := "SELECT id, seller_id, title, description, price, quantity, category, created_on FROM listings"

	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	sqlQuery += " ORDER BY created_on DESC, id DESC"

	sqlQuery += " LIMIT " + strconv.Itoa(query.Limit+1)

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
		if err := rows.Scan(&l.UUID, &l.SellerUUID, &l.Title, &l.Description, &l.Price, &l.Quantity, &l.CategoryUUID, &l.CreatedOn); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		listings = append(listings, l)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	hasMore := len(listings) > query.Limit
	cursor := response.Cursor{
		HasMore: hasMore,
	}

	if hasMore {
		listings = listings[:query.Limit]
	}

	if len(listings) > 0 {
		last := listings[len(listings)-1]
		cursor.CursorID = last.UUID
		cursor.CursorTimeStamp = last.CreatedOn
	}

	c.JSON(http.StatusOK, response.Response{
		Data: listings,
		Cursor: &cursor,
	})
}
