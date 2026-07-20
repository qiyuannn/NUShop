package listings

import (
	db "backend/database"
	"backend/models"
	"context"
	"log"
	"time"

	"github.com/google/uuid"
)

// will be called as a go routine function
func TrackSearch(userID string, searchlistings []models.Listing) {
	// need to check if user is in the manage page // done

	if userID != "" {
		if _, err := uuid.Parse(userID); err != nil {
			log.Print("[Error] TrackSearch error: Invalid userID")
			return
		}
	} else {
		log.Print("[Error] TrackSearch error: Missing userID")
		return
	}

	if len(searchlistings) == 0 {
		return
	}

	categoryCount := make(map[string]int)
	for _, listing := range searchlistings {
		categoryCount[listing.CategoryName] ++
	}
	var mostCategory string
	maxCount := 0

	for category, count := range categoryCount {
		if count > maxCount {
			mostCategory = category
			maxCount = count
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
 defer cancel()

	if _, err := db.Pool.Exec(
		ctx,
		`INSERT INTO events
			(user_id, event_type, category)
		VALUES ($1, $2, $3)`,
		userID, "search", mostCategory,
	); err != nil {
		log.Printf("[Error] TrackSearch error for %s: %s", userID, err)
		return
	}

	log.Print("[Success] TrackSearch")
}