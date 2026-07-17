package recommendation

import (
	"backend/models"
	"time"
)

type UserEvent struct {
	ID string // auto filled
	UserID string 
	EventType string // "search" or "view"
	ListingID *string // nullable for search events
	Category string 
	CreatedOn time.Time // autofilled
}

type CategoryScore struct {
	Category string 
	Score int
}

type CategoryListing struct {
	Category string `json:"category"`
	Listings []models.Listing `json:"listings"`
}