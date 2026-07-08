package listings

import (
	db "backend/database"
	"backend/response"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type getListingsV3Query struct {
	SellerID string `form:"sellerID"`
	Search   *string    `form:"search"`
	MinPrice int64     `form:"minPrice" binding:"gte=0,ltefield=MaxPrice"`
	MaxPrice int64     `form:"maxPrice" binding:"gte=0,gtefield=MinPrice"`
	Category string    `form:"category"`
	Condition []string `form:"condition" collection_format:"multi"`
	Limit    int       `form:"limit,default=20" binding:"gte=1,lte=100"`

	CursorRank *float64 `form:"cursorRank"`
	CursorID *string `form:"cursorID"`
	CursorTime *time.Time `form:"cursorTime"`
}

type searchListing struct {
	ID         string `json:"id"`
	SellerID   string `json:"sellerID"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Price        int64     `json:"price" binding:"gte=0"`
	Quantity     int64     `json:"quantity" binding:"gte=0"`
	Condition    string    `json:"condition"`
	CategoryName string `json:"categoryName"`
	CreatedOn    time.Time `json:"createdOn"`
	Images       []string  `json:"images"`

	Rank *float64
}

func GetListingsV3(c * gin.Context) {
	var query getListingsV3Query
	if err := c.ShouldBindQuery(&query); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	//For manage listings page -> seller requesting their own listing
	if c.FullPath() == "/listings/manage" {
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
		query.SellerID = userIDStr
	}

	conditions := []string{}
	args := []interface{}{}
	argsIndex := 1

	//Common filters
	if query.SellerID != "" {
		conditions = append(conditions, "seller_id = $"+strconv.Itoa(argsIndex))
		args = append(args, query.SellerID)
		argsIndex++
	}
	if query.MinPrice > 0 {
		conditions = append(conditions, "price >= $"+strconv.Itoa(argsIndex))
		args = append(args, query.MinPrice)
		argsIndex++
	}
	if query.MaxPrice != 0 {
		conditions = append(conditions, "price <= $"+strconv.Itoa(argsIndex))
		args = append(args, query.MaxPrice)
		argsIndex++
	}
	if query.Category != "" {
		conditions = append(conditions, "category_name = $"+strconv.Itoa(argsIndex))
		args = append(args, query.Category)
		argsIndex++
	}
	if len(query.Condition) > 0 {
		conditions = append(conditions, "condition = ANY($" + strconv.Itoa(argsIndex) + ")")
		args = append(args, query.Condition)
		argsIndex ++
	}

	// Split into search query vs no search query
	var listings []searchListing
	var cursor *response.Cursor
	if query.Search != nil { // search query present

		listings, cursor = SearchPresentHelper(c, conditions, args, argsIndex, query.Search, query.Limit, query.CursorRank, query.CursorID)

	} else { // search query absent

		hasCursorID := query.CursorID != nil
		hasCursorTime := query.CursorTime != nil
		if hasCursorID != hasCursorTime {
			c.Error(response.ErrBadRequest(errors.New("invalid cursor")))
			return
		}
		if hasCursorID && hasCursorTime {
			conditions = append(conditions, "(created_on, id) < ($"+strconv.Itoa(argsIndex)+",$"+strconv.Itoa(argsIndex+1)+")")
			args = append(args, query.CursorTime, query.CursorID)
			argsIndex += 2
		}

		listings, cursor = SearchAbsentHelper(c, conditions, args, query.Limit)
	}

	if (listings == nil || cursor == nil) {
		return
	}

	//Get images for listings
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
		 WHERE listing_id IN (`+strings.Join(placeholders, ",")+`)`,
			args...,
		)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		defer imageRows.Close()
		for imageRows.Next() {
			var listingID string
			var fileURL string
			if err := imageRows.Scan(&listingID, &fileURL); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return
			}
			imageMap[listingID] = append(imageMap[listingID], fileURL)
		}
	}

	for i := range listings {
		listings[i].Images = imageMap[listings[i].ID]
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": listings,
		"cursor": cursor,
	})
}