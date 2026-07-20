package listings

import (
	db "backend/database"
	"context"
	"log"
	"time"

	"github.com/google/uuid"
)

// will be called as a go routine function
func TrackView(userID string, listingID string) {
	// need to check if listingId != userID // done

	if userID != "" {
		if _, err := uuid.Parse(userID); err != nil {
			log.Print("[Error] TrackView error: Invalid userID")
			return
		}
	} else {
		log.Print("[Error] TrackView error: Missing userID")
		return
	}

	if listingID != "" {
		if _, err := uuid.Parse(listingID); err != nil {
			log.Print("[Error] TrackView error: Invalid listingID")
			return
		}
	} else {
		log.Print("[Error] TrackView error: Missing listingID")
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Exec(
		ctx,
		`INSERT INTO events
			(user_id, event_type, listing_id, category) 
		SELECT $1, $2, $3, l.category_name
		FROM listings l
			WHERE l.id = $3
				AND l.seller_id <> $1`,
 		userID, "view", listingID,
	); 
	if err != nil {
		log.Printf("[Error] TrackView DB insert error for %s: %s", userID, err)
		return
	}
	if rows.RowsAffected() == 0 {
		log.Printf("[Error] TrackView DB insert error for %s: listing not found", userID)
		return
	}

	log.Print("[Success] TrackView")
}