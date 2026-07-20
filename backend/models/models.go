package models

import (
	"time"
)

type User struct {
	ID         string `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"passwordHash"`
	CreatedOn    time.Time `json:"createdOn"`
}

type Listing struct {
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

	Score *float64 `json:"score"`
}

type Image struct {
	ID string `json:"uuid"`
	SellerUUID string `json:"sellerID"`
	FilePath string `json:"filePath"`
}

type Cart struct {
	UserID string `json:"userID"`
	ListingID string `json:"listingID"`
	Quantity int `json:"quanitity"`
}