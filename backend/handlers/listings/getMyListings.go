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

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetMyListings(c *gin.Context) {
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

	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`
		SELECT
			uuid,
			seller_uuid,
			title,
			description,
			price,
			quantity,
			condition,
			category_uuid,
			created_on
		FROM listings
		WHERE seller_uuid = $1
		ORDER BY created_on DESC, uuid DESC
		LIMIT $2
		`,
		userID,
		limit+1,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer rows.Close()

	listings := []models.Listing{}
	for rows.Next() {
		var l models.Listing
		if err := rows.Scan(
			&l.UUID,
			&l.SellerUUID,
			&l.Title,
			&l.Description,
			&l.Price,
			&l.Quantity,
			&l.Condition,
			&l.CategoryUUID,
			&l.CreatedOn,
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
		ids = append(ids, l.UUID)
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
			`SELECT listing_uuid, file_url
			 FROM images
			 WHERE listing_uuid IN (`+strings.Join(placeholders, ",")+`)`,
			args...,
		)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		defer imageRows.Close()

		for imageRows.Next() {
			var listingUUID string
			var fileURL string
			if err := imageRows.Scan(&listingUUID, &fileURL); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return
			}
			imageMap[listingUUID] = append(imageMap[listingUUID], fileURL)
		}

		if err := imageRows.Err(); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
	}

	for i := range listings {
		listings[i].Images = imageMap[listings[i].UUID]
	}

	hasMore := len(listings) > limit
	if hasMore {
		listings = listings[:limit]
	}

	response.Success(c, http.StatusOK, listings)
}