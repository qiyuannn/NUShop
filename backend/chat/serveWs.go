package chat

import (
	"backend/auth"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}


func ServeWs(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return 
		}

		tokenStr := c.Query("token")

		claims, err := auth.VerifyToken(tokenStr)
		if err != nil {
			conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(4001, "UNAUTHORISED"), time.Now().Add(time.Second))
			conn.Close()
			return
		}

		userIDStr := claims.Subject
		if userIDStr == ""{	
			conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(4001, "UNAUTHORISED"), time.Now().Add(time.Second))
			conn.Close()
			return 
		}

		if _, err := uuid.Parse(userIDStr); err != nil {
			conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(4001, "UNAUTHORISED"), time.Now().Add(time.Second))
			conn.Close()
			return 
		}
	
		client := &Client{hub, conn, userIDStr, make(chan []byte, 256)}
		hub.register <- client
	
		go client.writePump()
		go client.readPump()
	}
}