package models

import (
	"time"

	"github.com/google/uuid"
)


type User struct {
	UUID uuid.UUID `json:"uuid"`
	FirstName string `json:"firstName"`
	LastName string `json:"lastName"`
	Email string `json:"email"`
	PasswordHash string `json:"passwordHash"`
	CreatedOn time.Time `json:"createdOn"`
}

type Listing struct {
	UUID uuid.UUID `json:"uuid"`
	SellerUUID uuid.UUID `json:"sellerUUID"`
	Title string `json:"title"`
	Description string `json:"description"`
	Price int64 `json:"price" binding:"gte=0"`
	Quantity int64 `json:"quantity" binding:"gte=0"`
	CategoryUUID uuid.UUID `json:"categoryUUID"`
	CreatedOn time.Time `json:"createdOn"`
	Images []string `json:"images"`
}

type Category struct {
	ID uuid.UUID `json:"uuid"`
	Name string `json:"name"`
}