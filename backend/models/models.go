package models

import (
	"time"

	"github.com/google/uuid"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AccountCreationRequest struct {
	Username string `json:"username"`
	Email string `json:"email"`
	Password string `json:"password"`
}

type User struct {
	ID uuid.UUID `json:"id"`
	Username string `json:"username"`
	Email string `json:"email"`
	Password_hash string `json:"password_hash"`
	Created_on time.Time `json:"created_on"`
}

type Listing struct {
	ID uuid.UUID `json:"id"`
	SellerID uuid.UUID `json:"seller_id"`
	Title string `json:"title"`
	Description string `json:"description"`
	Price int64 `json:"price" binding:"gte=0"`
	Quantity int64 `json:"quantity" binding:"gte=0"`
	Category uuid.UUID `json:"category"`
	CreatedOn time.Time `json:"created_on"`
}

type Category struct {
	ID uuid.UUID `json:"id"`
	Name string `json:"name"`
}