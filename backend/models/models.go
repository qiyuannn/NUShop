package models

import (
	"time"
)

type User struct {
	UUID         string `json:"uuid"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"passwordHash"`
	CreatedOn    time.Time `json:"createdOn"`
}

type Listing struct {
	UUID         string `json:"uuid"`
	SellerUUID   string `json:"sellerUUID"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Price        int64     `json:"price" binding:"gte=0"`
	Quantity     int64     `json:"quantity" binding:"gte=0"`
	Condition    string    `json:"condition"`
	CategoryUUID string `json:"categoryUUID"`
	CreatedOn    time.Time `json:"createdOn"`
	Images       []string  `json:"images"`
}

type Category struct {
	ID  	string `json:"uuid"`
	Name string    `json:"name"`
}

type Image struct {
	UUID string `json:"uuid"`
	SellerUUID string `json:"sellerUUID"`
	FilePath string `json:"filePath"`
}