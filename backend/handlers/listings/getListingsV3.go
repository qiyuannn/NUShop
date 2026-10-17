package listings

import (
	"backend/models"
	"backend/response"
	"errors"
	"net/http"
	"strconv"

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

	CursorScore *float64 `form:"cursorScore"`
	CursorID *string `form:"cursorID"`
	CursorSeed *string `form:"cursorSeed"`
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
	var listings []models.Listing
	var cursor *response.Cursor
	if query.Search != nil { // search query present

		listings, cursor = SearchPresentHelper(
			c, 
			conditions, 
			args, 
			argsIndex, 
			query.Search, 
			query.Limit, 
			query.CursorScore, 
			query.CursorID,
		)

	} else { // search query absent

		listings, cursor = SearchAbsentHelperV2(
			c, 
			conditions, 
			args, 
			argsIndex,
			query.Limit, 
			query.CursorScore, 
			query.CursorID, 
			query.CursorSeed,
			query.SellerID,
		)
	}

	if (listings == nil || cursor == nil) {
		return
	}

	//Get images for listings
	listings, err := GetImagesHelper(c, listings)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if userID, exists := c.Get("userID"); exists && c.FullPath() != "/listings/manage" {
		userIDstr := userID.(string)
		go TrackSearch(userIDstr, listings)
	}

	response.Success(c, http.StatusOK, gin.H{
		"listings": listings,
		"cursor": cursor,
	})
}