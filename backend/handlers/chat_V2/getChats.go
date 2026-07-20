package chatv2

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type chat struct {
	ListingID   string    `json:"listingID"`
	Content     string    `json:"content"`
	Created_On  time.Time `json:"createdOn"`
	Username    string    `json:"otherName"`
	OtherID     string    `json:"otherID"`
	Image       *string   `json:"image"`
	Title       string    `json:"title"`
	UnreadCount int       `json:"unreadCount"`
}

func GetChats(c *gin.Context) {
	userIDVal, ok := c.Get("userID")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}

	userIDStr, ok := userIDVal.(string)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	if _, err := uuid.Parse(userIDStr); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	rows, err := db.Pool.Query(
		c.Request.Context(),
		`
	WITH latest AS (
		SELECT DISTINCT ON (m.listing_id, other.id)
			m.listing_id,
			m.content,
			m.created_on,
			other.username,
			other.id AS other_id,
			i.file_url,
			l.title
		FROM messages m
		JOIN users other
			ON other.id = CASE
				WHEN m.sender_id = $1 THEN m.receiver_id
				ELSE m.sender_id
			END
		JOIN listings l
			ON l.id = m.listing_id
		LEFT JOIN LATERAL (
			SELECT file_url
			FROM images
			WHERE listing_id = m.listing_id
			LIMIT 1
		) i ON true
		WHERE m.sender_id = $1 OR m.receiver_id = $1
		ORDER BY m.listing_id, other.id, m.created_on DESC
	),
	unread AS (
		SELECT
			m.listing_id,
			m.sender_id AS other_id,
			COUNT(*)::int AS unread_count
		FROM messages m
		LEFT JOIN "read" r
			ON r.user_id = $1
			AND r.other_id = m.sender_id
			AND r.listing_id = m.listing_id
		WHERE m.receiver_id = $1
			AND (
				r.last_read_id IS NULL
				OR m.created_on > (
					SELECT created_on
					FROM messages
					WHERE id = r.last_read_id
				)
			)
		GROUP BY m.listing_id, m.sender_id
	)
	SELECT
		l.listing_id,
		l.content,
		l.created_on,
		l.username,
		l.other_id,
		l.file_url,
		l.title,
		COALESCE(u.unread_count, 0)
	FROM latest l
	LEFT JOIN unread u
		ON u.listing_id = l.listing_id
		AND u.other_id = l.other_id
	ORDER BY l.created_on DESC
	`,
		userIDStr,
	)

	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	defer rows.Close()

	chats := make([]chat, 0)

	for rows.Next() {
		var ch chat
		if err := rows.Scan(
			&ch.ListingID,
			&ch.Content,
			&ch.Created_On,
			&ch.Username,
			&ch.OtherID,
			&ch.Image,
			&ch.Title,
			&ch.UnreadCount,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}
		chats = append(chats, ch)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"chats": chats,
	})
}
