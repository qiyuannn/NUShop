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
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type getListingsQuery struct{
	SellerID uuid.UUID `form:"seller_id"`
	Search string `form:"search"`
	MinPrice int64 `form:"min_price" binding:"gte=0,ltefield=MaxPrice"`
	MaxPrice int64 `form:"max_price" binding:"gte=0,gtefield=MinPrice"` 
	Category string `form:"category"`
	Limit int `form:"limit,default=20" binding:"gte=1,lte=100"`

	CursorTime time.Time `form:"cursor_time"`
	CursorID uuid.UUID `form:"cursor_id"`
}

type CreateListingBody struct {
	Title string `json:"title"`
	Description string `json:"description"`
	Price int64 `json:"price" binding:"gte=0"`
	Quantity int64 `json:"quantity" binding:"gte=0"`
	Category uuid.UUID `json:"category"`
}

func GetListing(c *gin.Context) {
	param := c.Param("listingID")

	var listing models.Listing
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT 
		uuid,
		sellerUUID,
		title,
		description,
		price,
		quantitiy,
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
		&listing.CategoryUUID,
		&listing.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(err))
			return 
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		image_url
		FROM images
		WHERE listingUUID = $1`,
		param,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer rows.Close()

	var images []string
	for rows.Next() {
		var image_url string
		if err := rows.Scan(&image_url); err!= nil {
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
	meta := response.Meta{
		HasMore: hasMore,
	}

	if hasMore {
		listings = listings[:query.Limit]
	}
	
	if len(listings) > 0 {
		last := listings[len(listings) - 1]
		meta.CursorID = last.UUID
		meta.CursorTimeStamp = last.CreatedOn
	}

	c.JSON(http.StatusOK, response.Response{
		Data: listings,
		Meta: &meta,
	})
}

func DeleteListing(c *gin.Context) {
	userIDValue, ok := c.Get("user_id")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	listingIDValue := c.Param("id")
	listingID, err := uuid.Parse(listingIDValue)
	if err != nil {
		c.Error(response.ErrBadRequest(err))
		return 
	}

	var deletedID uuid.UUID
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		"DELETE FROM listings WHERE id = $1 AND seller_id = $2 RETURNING id ",
		listingID, userID,
	).Scan(&deletedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(err))
			return
		}

		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listing_id": listingID,
		"message": "listing deleted",
	})
}

func CreateListing(c *gin.Context) {
	userIDValue, ok := c.Get("user_id")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	var listing CreateListingBody
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}
	
	var insertedListing models.Listing
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`INSERT INTO listings (seller_id, title, description, price, quantity, category_id) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id, seller_id, title, description, price, quantity, category_id, created_on`,
		userID, listing.Title, listing.Description, listing.Price, listing.Quantity, listing.Category,
	).Scan(&insertedListing.UUID, &insertedListing.SellerUUID, &insertedListing.Title,
		&insertedListing.Description, &insertedListing.Price, &insertedListing.Quantity, 
		&insertedListing.CategoryUUID, &insertedListing.CreatedOn,
		); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			switch pgErr.Code {
				case "23502": 
					c.Error(response.ErrBadRequest(errors.New("db not null violation")))
					return
				case "23503":
					c.Error(response.ErrBadRequest(errors.New("foreign key violation")))
					return
				case "23514":
					c.Error(response.ErrBadRequest(errors.New("invalid data")))
					return
			}
		} 
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusCreated, gin.H{
		"listing": insertedListing,
		"message": "created",
	})
}

func UpdateListing(c *gin.Context){
	userIDValue, ok := c.Get("user_id")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	var listing CreateListingBody
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	idVal := c.Param("id")
	id, err := uuid.Parse(idVal)
	if err != nil {
		c.Error(response.ErrBadRequest(errors.New("invalid post id")))
		return
	}

	var updatedListing models.Listing

	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`UPDATE listings SET
		title = $1,
		description = $2,
		price = $3,
		quantity = $4,
		category_id = $5
		WHERE id = $6 AND seller_id = $7 
		RETURNING id, seller_id, title, description, price, quantity, category_id, created_on`,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.Quantity,
		listing.Category,
		id,
		userID,
	).Scan(
		&updatedListing.UUID,
		&updatedListing.SellerUUID,
		&updatedListing.Title,
		&updatedListing.Description,
		&updatedListing.Price,
		&updatedListing.Quantity,
		&updatedListing.CategoryUUID,
		&updatedListing.CreatedOn,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(errors.New("listing does not exist")))
			return
		}
		if pgErr, ok := err.(*pgconn.PgError); ok {
			switch pgErr.Code {
				case "23502": 
					c.Error(response.ErrBadRequest(errors.New("db not null violation")))
					return
				case "23503":
					c.Error(response.ErrBadRequest(errors.New("foreign key violation")))
					return
				case "23514":
					c.Error(response.ErrBadRequest(errors.New("invalid data")))
					return
			}
		} 
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listing": updatedListing,
		"message": "updated listing",
	})
}