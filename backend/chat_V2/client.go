package chatv2

import (
	"backend/auth"
	db "backend/database"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
)

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	userID string
	send   chan []byte
}

const (
	pongWait     = 60 * time.Second
	pingInterval = 54 * time.Second
	writeWait    = 10 * time.Second
)

func (c *Client) writePump() {
	ticker := time.NewTicker(pingInterval)

	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[Error] writePump ping error for %s: %s", c.userID, err)
				return
			}
		case payload, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, nil)
				log.Printf("[Error] writePump write error for %s: Send channel closed by hub", c.userID)
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				log.Printf("[Error] writePump write error for %s: %s", c.userID, err)
				return
			}
		}
	}
}

func sendChatEmailNotification(receiverID, senderID, listingID, content string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var receiverEmail string
	var receiverUsername string
	var senderUsername string
	var listingTitle string

	err := db.Pool.QueryRow(
		ctx,
		`
        SELECT
            r.email,
            r.username,
            s.username,
            l.title
        FROM users r
        JOIN users s ON s.id = $2
        JOIN listings l ON l.id = $3
        WHERE r.id = $1
        `,
		receiverID,
		senderID,
		listingID,
	).Scan(
		&receiverEmail,
		&receiverUsername,
		&senderUsername,
		&listingTitle,
	)
	if err != nil {
		log.Printf("[Error] chat email lookup failed for receiver %s: %s", receiverID, err)
		return
	}

	preview := content
	if len(preview) > 160 {
		preview = preview[:157] + "..."
	}

	subject := fmt.Sprintf("New message from %s on NUShop", senderUsername)
	body := fmt.Sprintf(
		"Hello %s,\r\n\r\nYou received a new message from %s about \"%s\".\r\n\r\nMessage:\r\n%s\r\n\r\nOpen NUShop to reply.\r\n\r\nNUShop Team",
		receiverUsername,
		senderUsername,
		listingTitle,
		preview,
	)

	if err := auth.SendEmail(receiverEmail, subject, body); err != nil {
		log.Printf("[Error] sending chat email to %s: %s", receiverEmail, err)
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(
		func(appData string) error {
			c.conn.SetReadDeadline(time.Now().Add(pongWait))
			return nil
		},
	)

	for {
		_, payload, err := c.conn.ReadMessage()
		if err != nil {
			log.Printf("[Error] readPump error for %s: %s", c.userID, err)
			break
		}

		var wsMessage WSMessage
		if err := json.Unmarshal(payload, &wsMessage); err != nil {
			log.Printf("[Error] readPump failed to unmarshal JSON for %s: %s", c.userID, err)
			continue
		}

		switch wsMessage.Type {
		case "message":
			if wsMessage.Message == nil {
				continue
			}
			if wsMessage.Message.ReceiverID == c.userID {
				continue
			}

			ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)

			var saved Mesage
			err := db.Pool.QueryRow(
				ctx,
				`INSERT INTO messages
				(sender_id,
				receiver_id,
				listing_id,
				content) 
				VALUES 
				($1, $2, $3, $4)
				RETURNING
				id,
				sender_id,
				receiver_id,
				listing_id,
				content,
				created_on`,
				c.userID,
				wsMessage.Message.ReceiverID,
				wsMessage.Message.ListingID,
				wsMessage.Message.Content,
			).Scan(
				&saved.ID,
				&saved.SenderID,
				&saved.ReceiverID,
				&saved.ListingID,
				&saved.Content,
				&saved.CreatedOn,
			)

			cancel()

			if err != nil {
				log.Printf("[Error] writePump failed to saved message into database for %s: %s", c.userID, err)
				errMsg, _ := json.Marshal(WSMessage{
					Type:    "error",
					Message: wsMessage.Message,
				})
				select {
				case c.send <- errMsg:
				default:
					return
				}
				continue
			}

			msg := WSMessage{
				Type:    "message",
				Message: &saved,
			}

			c.hub.route <- msg

			go sendChatEmailNotification(
				saved.ReceiverID,
				saved.SenderID,
				saved.ListingID,
				saved.Content,
			)

		case "read":
			if wsMessage.Read == nil {
				continue
			}

			log.Print("read received")

			ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)

			var readReciept Read
			err := db.Pool.QueryRow(
				ctx,
				`INSERT INTO read
					(user_id,
					other_id,
					listing_id,
					last_read_id)
					VALUES 
					($1, $2, $3, $4)
				ON CONFLICT (user_id, other_id, listing_id)
					DO UPDATE
					SET last_read_id = EXCLUDED.last_read_id
					WHERE (SELECT created_on FROM messages WHERE id = EXCLUDED.last_read_id) 
						> (SELECT created_on FROM messages WHERE id = read.last_read_id) 
						AND (SELECT sender_id FROM messages WHERE id = EXCLUDED.last_read_id) = read.other_id
				RETURNING
					user_id, 
					other_id,
					listing_id,
					last_read_id`,
				c.userID,
				wsMessage.Read.OtherID,
				wsMessage.Read.ListingID,
				wsMessage.Read.LastReadID,
			).Scan(
				&readReciept.UserID,
				&readReciept.OtherID,
				&readReciept.ListingID,
				&readReciept.LastReadID,
			)

			cancel()

			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					log.Printf("[Error] writePump stale read update for %s: %s", c.userID, err)
				}

				log.Printf("[Error] writePump failed to save read into database for %s: %s", c.userID, err)
				continue
			}

			msg := WSMessage{
				Type: "read",
				Read: &readReciept,
			}

			c.hub.route <- msg
		}
	}
}

// READ
// userID (reader) -> otherID
// message belong to other ID
