package chat

import (
	db "backend/database"
	"backend/models"
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub *Hub
	conn *websocket.Conn
	userID string
	send chan []byte
}

const (
	writeWait = 10 * time.Second
	pongWait = 15 * time.Second
	pingInterval = 10 * time.Second
)

func (c *Client) readPump() {
	defer func () {
		log.Printf(">>> readPump exiting for %s", c.userID)
		c.hub.unregister <- c 
		c.conn.Close()
	}()
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(
		func(string) error {
			c.conn.SetReadDeadline(time.Now().Add(pongWait))
			return nil
		},
	)

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			log.Printf(">>> readPump error for %s: %v", c.userID, err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var message models.WSMessage
		if err := json.Unmarshal(data, &message); err != nil {
			continue
		}
		message.SenderID = c.userID

		ctx, cancel := context.WithTimeout(context.Background(), time.Second * 5)

		var saved models.Message
		err = db.Pool.QueryRow(
			ctx, 
			`INSERT INTO messages
			(sender_id,
			receiver_id,
			content)
			VALUES ($1, $2, $3) RETURNING 
			id, 
			sender_id,
			receiver_id,
			content,
			read,
			created_on`,
			message.SenderID,
			message.ReceiverID,
			message.Content,
		).Scan(
			&saved.ID,
			&saved.SenderID,
			&saved.ReceiverID,
			&saved.Content,
			&saved.Read,
			&saved.CreatedOn,
		); 

		cancel()
		
		if err != nil {
			log.Printf("failed to save message from %s: %v", message.SenderID, err)
			errMsg, _ := json.Marshal(models.WSRespnse{
					Type:  "error",
					ChatID: message.ReceiverID,
					Error: "failed to save message",
			})
			select {
			case c.send <- errMsg:
			default:
				return
			}
			continue  
		}

		c.hub.route <- &saved
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingInterval)
	defer func () {
		log.Printf(">>> writePump exiting for %s", c.userID)
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select{
		case payload, ok := <- c.send:
			log.Printf(">>> writePump sending to %s: %s", c.userID, string(payload))
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, nil)
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				log.Printf(">>> writePump write error for %s: %v", c.userID, err)
        return
    	}
		case <- ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf(">>> writePump ping error for %s: %v", c.userID, err)
				return
			}
		}
	}
}