package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

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
	CategoryUUID string `form:"category"`
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
			category_uuid = $6
		WHERE uuid = $7 AND seller_uuid = $8
		RETURNING
			uuid,
			seller_uuid,
			title,
			description,
			price,
			quantity,
			condition,
			category_uuid,
			created_on`,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.Quantity,
		listing.Condition,
		listing.CategoryUUID,
		listingID,
		userID,
	).Scan(
		&updatedListing.UUID,
		&updatedListing.SellerUUID,
		&updatedListing.Title,
		&updatedListing.Description,
		&updatedListing.Price,
		&updatedListing.Quantity,
		&updatedListing.Condition,
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

	if len(files) > 0 {
		if _, err := tx.Exec(
			c.Request.Context(),
			`DELETE FROM images WHERE listing_uuid = $1`,
			listingID,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		for _, file := range files {
			fileUUID := uuid.NewString()
			uploadDir := os.Getenv("UPLOAD_DIR")
			if uploadDir == "" {
				uploadDir = "./uploads"
			}
			if err := os.MkdirAll(uploadDir, 0755); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return
			}

			filePath := "/uploads/" + fileUUID + filepath.Ext(file.Filename)
			savePath := filepath.Join(uploadDir, fileUUID+filepath.Ext(file.Filename))

			if err := c.SaveUploadedFile(file, savePath); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return
			}

			if _, err := tx.Exec(
				c.Request.Context(),
				`INSERT INTO images (listing_uuid, file_url) VALUES ($1, $2)`,
				listingID,
				filePath,
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
		"message": "updated listing",
	})
}
