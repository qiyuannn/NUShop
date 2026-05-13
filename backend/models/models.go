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
	Seller_id uuid.UUID `json:"seller_id"`
	Title string `json:"title"`
	Description string `json:"description"`
	Price int64 `json:"price"`
	Quantity int64 `json:"quantity"`
	Category uuid.UUID `json:"category"`
	Created_on time.Time `json:"created_on"`
}

type Category struct {
	ID uuid.UUID `json:"id"`
	Name string `json:"name"`
}