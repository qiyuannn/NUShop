package recommendation

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)



func PersonalisedReccsV2(c *gin.Context) () {
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
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	listings, err := GetReccomendationsListings(c, userIDStr)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if len (listings) < 5 {
		c.Error(response.ErrNotFound(errors.New("insufficient listings fetched")))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": listings,
	})
}

func GetReccomendationsListings(c *gin.Context, userID string) ([]models.Listing, error) {
	categoryScores, err := GetCategoryScoresV2(c, userID)
	if err!= nil {
		return nil, err
	}

	tx, err := db.Pool.Begin(c.Request.Context())
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(c.Request.Context())

	listings := []models.Listing{}

	for _, cs := range categoryScores {
		rows, err := tx.Query(
			c.Request.Context(),
			`SELECT 
				id, 
				seller_id,
				title,
				description,
				price,
				quantity,
				condition,
				category_name,
				created_on
			FROM listings
			WHERE category_name  = $1
			ORDER BY (
				0.75 * EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - created_on)) / (7 * 86400.0)) +
				0.25 * random()
			) DESC
			LIMIT $2`,
			cs.Category, cs.Score,
		); 
		
		if err != nil {
			return nil, err
		}

		for rows.Next() {
			var l models.Listing
			if err := rows.Scan(
				&l.ID,
				&l.SellerID,
				&l.Title,
				&l.Description,
				&l.Price,
				&l.Quantity,
				&l.Condition,
				&l.CategoryName,
				&l.CreatedOn,
			); err != nil {
				return nil, err
			}
			listings = append(listings, l)
		}

		if err := rows.Err(); err != nil {
			return nil, err
		}

		rows.Close()
	}

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