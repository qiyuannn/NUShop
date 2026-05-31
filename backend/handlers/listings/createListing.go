package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

func CreateListing(c *gin.Context) {
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

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	var listing CreateListingRequest
	if err := c.ShouldBind(&listing); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	categoryUUID, err := uuid.Parse(strings.TrimSpace(listing.CategoryUUID))
	if err != nil || categoryUUID == uuid.Nil {
		c.Error(response.ErrBadRequest(errors.New("category is required")))
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	files := form.File["file"]

	args := []any{}
	placeholder := []string{}
	queryIndex := 2

	for _, file := range files {
		fileUUID := uuid.NewString()
		filePath := "/uploads/" + fileUUID + filepath.Ext(file.Filename)
		args = append(args, filePath)

		if err := c.SaveUploadedFile(file, "."+filePath); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		placeholder = append(placeholder, "($1, $"+strconv.Itoa(queryIndex)+")")
		queryIndex++
	}

	var insertedListing models.Listing
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`INSERT INTO listings 
		(seller_uuid, 
		title, 
		description, 
		price, 
		quantity,
		condition,
		category_uuid) 
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING 
		uuid, 
		seller_uuid, 
		title, 
		description, 
		price,
		condition,
		quantity, 
		category_uuid, 
		created_on`,
		userID,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.Quantity,
		listing.Condition,
		categoryUUID,
	).Scan(
		&insertedListing.UUID,
		&insertedListing.SellerUUID,
		&insertedListing.Title,
		&insertedListing.Description,
		&insertedListing.Price,
		&insertedListing.Condition,
		&insertedListing.Quantity,
		&insertedListing.CategoryUUID,
		&insertedListing.CreatedOn,
	); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			switch pgErr.Code {
			case "23502":
				c.Error(response.ErrBadRequest(errors.New("db not null violation")))
				return
			case "23503":
				c.Error(response.ErrBadRequest(err))
				return
			case "23514":
				c.Error(response.ErrBadRequest(errors.New("invalid data")))
				return
			}
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if len(files) > 0 {
		sqlQuery := "INSERT INTO images (listing_uuid, file_url) VALUES " + strings.Join(placeholder, ", ")
		allArgs := []any{insertedListing.UUID}
		allArgs = append(allArgs, args...)

		if _, err := db.Pool.Exec(
			c.Request.Context(),
			sqlQuery,
			allArgs...,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
	}

	response.Success(c, http.StatusCreated, gin.H{
		"listing": insertedListing,
		"message": "created",
	})
}
