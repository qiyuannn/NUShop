package cart

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CartItem struct {
	Listing models.Listing `json:"listing"`
	Quantity int `json:"quantity"`
}

func GetCart(c *gin.Context) {
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
	if _, err := uuid.Parse(userIDStr); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT listing_id, quantity FROM cart WHERE user_id = $1`,
		userIDStr,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
 	}

	defer rows.Close()

	listingIDs := []string{}
	qtyMap := map[string] int{}

	for rows.Next() {
		var id string
		var qty int
		if err := rows.Scan(&id, &qty); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return 
		}
		listingIDs = append(listingIDs, id)
		qtyMap[id] = qty
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	rows.Close()

	if len(listingIDs) == 0 {
		response.Success(c, http.StatusOK, gin.H{
			"listings": []models.Listing{},
		})
		return
	}

	placeholders := []string{}
	args := []any{}

	for i, id := range listingIDs {
		placeholders = append(placeholders, "$" + strconv.Itoa(i + 1))
		args = append(args, id)
	}

	listingRows, err := db.Pool.Query(
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
		WHERE id IN (` + strings.Join(placeholders, ",") + `)`,
		args...,
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer listingRows.Close()

	listings := []models.Listing{}

	for listingRows.Next() {
		var listing models.Listing
		if err := listingRows.Scan(
			&listing.ID,
			&listing.SellerID,
			&listing.Title,
			&listing.Description,
			&listing.Price,
			&listing.Quantity,
			&listing.Condition,
			&listing.CategoryName,
			&listing.CreatedOn,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		listings = append(listings, listing)
	}

	if err := listingRows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	listingRows.Close()

	imageRows, err := db.Pool.Query(
		c.Request.Context(),
		`SELECT 
		listing_id,
		file_url
		FROM images 
		WHERE listing_id IN (` + strings.Join(placeholders, ",") + `)`,
		args...
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer imageRows.Close()

	imageMap := map[string] []string{}

	for imageRows.Next() {
		var listingID string
		var fileURL string
		if err := imageRows.Scan(&listingID, &fileURL); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		imageMap[listingID] = append(imageMap[listingID], fileURL)
	}

	if err := imageRows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return 
	}

	cartItems := make([]CartItem, 0, len(listings))

	for i := range listings {
		listings[i].Images = imageMap[listings[i].ID]
		cartItems = append(cartItems, CartItem{
			Listing:  listings[i],
			Quantity: qtyMap[listings[i].ID],
		})
	}	

	response.Success(c, http.StatusOK, gin.H{
		"cartItems": cartItems,
	})
}