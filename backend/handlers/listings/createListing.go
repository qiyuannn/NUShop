package listings

import (
	"backend/cloudinary"
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"log"
	"mime/multipart"
	"net/http"

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

	var files []*multipart.FileHeader
	if form != nil {
		files = form.File["file"]
	}

	uploadedImages := make([]cloudinary.UploadResult, 0, len(files))
	for i, file := range files {
		log.Print(i)
		openedFile, err := file.Open()
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		uploadResult, uploadErr := cloudinary.UploadImage(openedFile)
		closeErr := openedFile.Close()
		if closeErr != nil {
			c.Error(response.ErrInternalServerError(closeErr))
			return
		}
		if uploadErr != nil {
			c.Error(response.ErrInternalServerError(uploadErr))
			return
		}

		uploadedImages = append(uploadedImages, *uploadResult)
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
			(seller_id, title, description, price, quantity, condition, category_name) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING 
			id, seller_id, title, description, price, condition, quantity, category_name, created_on`,
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

	for _, img := range uploadedImages {
		if _, err := tx.Exec(
			c.Request.Context(),
			`INSERT INTO images (listing_id, file_url, public_id) VALUES ($1, $2, $3)`,
			insertedListing.ID,
			img.URL,
			img.PublicID,
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
