package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"os"
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

	form, err := c.MultipartForm()
	if err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	files := form.File["file"]

	args := []any{}
	placeholder := []string{}
	queryIndex := 2

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	for _, file := range files {
		fileID := uuid.NewString()
		filePath := "/uploads/" + fileID + filepath.Ext(file.Filename)
		args = append(args, filePath)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		args = append(args, filePath)
		placeholder = append(placeholder, "($1, $"+strconv.Itoa(queryIndex)+")")
		queryIndex++
	}

	tx, err := db.Pool.Begin(c.Request.Context())
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer tx.Rollback(c.Request.Context())

	var insertedListing models.Listing
	if err := tx.QueryRow(
		c.Request.Context(),
		`INSERT INTO listings 
		(seller_id, 
		title, 
		description, 
		price, 
		quantity,
		condition,
		category_name) 
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING 
		id, 
		seller_id, 
		title, 
		description, 
		price,
		condition,
		quantity, 
		category_name, 
		created_on`,
		userID,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.Quantity,
		listing.Condition,
		listing.CategoryName,
	).Scan(
		&insertedListing.ID,
		&insertedListing.SellerID,
		&insertedListing.Title,
		&insertedListing.Description,
		&insertedListing.Price,
		&insertedListing.Condition,
		&insertedListing.Quantity,
		&insertedListing.CategoryName,
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
		sqlQuery := "INSERT INTO images (listing_id, file_url) VALUES " + strings.Join(placeholder, ", ")
		allArgs := []any{insertedListing.ID}
		allArgs = append(allArgs, args...)

		if _, err := tx.Exec(
			c.Request.Context(),
			sqlQuery,
			allArgs...,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusCreated, gin.H{
		"listing": insertedListing,
	})
}
