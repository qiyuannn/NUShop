package listings

import (
	db "backend/database"
	"backend/models"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

func GetImagesHelper(c *gin.Context, listings []models.Listing) ([]models.Listing, error) {
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
		 WHERE listing_id IN (` + strings.Join(placeholders, ",")+`)`,
			args...,
		)
		if err != nil {
			return nil, err
		}
		defer imageRows.Close()
		for imageRows.Next() {
			var listingID string
			var fileURL string
			if err := imageRows.Scan(&listingID, &fileURL); err != nil {
				return nil, err
			}
			imageMap[listingID] = append(imageMap[listingID], fileURL)
		}
	}

	for i := range listings {
		listings[i].Images = imageMap[listings[i].ID]
	}

	return listings, nil
}