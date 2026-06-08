package listings

import (
	"backend/cloudinary"
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"mime/multipart"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type CreateListingRequest struct {
	Title        string `form:"title"`
	Description  string `form:"description"`
	Price        int64  `form:"price" binding:"gte=0"`
	Quantity     int64  `form:"quantity" binding:"gte=0"`
	Condition    string `form:"condition"`
	CategoryName string `form:"category"`
}

func UpdateListing(c *gin.Context) {
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

	listingID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.Error(response.ErrBadRequest(errors.New("invalid listing id")))
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

	uploadedURLs := make([]string, 0, len(files))
	for _, file := range files {
		openedFile, err := file.Open()
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		imageURL, uploadErr := cloudinary.UploadImage(openedFile)
		closeErr := openedFile.Close()
		if closeErr != nil {
			c.Error(response.ErrInternalServerError(closeErr))
			return
		}
		if uploadErr != nil {
			c.Error(response.ErrInternalServerError(uploadErr))
			return
		}

		uploadedURLs = append(uploadedURLs, imageURL)
	}

	tx, err := db.Pool.Begin(c.Request.Context())
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer tx.Rollback(c.Request.Context())

	var updatedListing models.Listing
	if err := tx.QueryRow(
		c.Request.Context(),
		`UPDATE listings SET
			title = $1,
			description = $2,
			price = $3,
			quantity = $4,
			condition = $5,
			category_name = $6
		WHERE id = $7 AND seller_id = $8
		RETURNING
			id,
			seller_id,
			title,
			description,
			price,
			quantity,
			condition,
			category_name,
			created_on`,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.Quantity,
		listing.Condition,
		listing.CategoryName,
		listingID,
		userID,
	).Scan(
		&updatedListing.ID,
		&updatedListing.SellerID,
		&updatedListing.Title,
		&updatedListing.Description,
		&updatedListing.Price,
		&updatedListing.Quantity,
		&updatedListing.Condition,
		&updatedListing.CategoryName,
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

	if len(uploadedURLs) > 0 {
		if _, err := tx.Exec(
			c.Request.Context(),
			`DELETE FROM images WHERE listing_id = $1`,
			listingID,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		for _, imageURL := range uploadedURLs {

			if _, err := tx.Exec(
				c.Request.Context(),
				`INSERT INTO images (listing_id, file_url) VALUES ($1, $2)`,
				listingID,
				imageURL,
			); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return
			}
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listing": updatedListing,
	})
}
