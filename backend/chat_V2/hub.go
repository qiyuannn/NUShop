package chatv2

import (
	"encoding/json"
	"log"
)

type Hub struct {
	clients map[string] *Client
	register chan *Client
	unregister chan *Client
	route chan WSMessage
}

func newHub() *Hub{
	return &Hub{
		clients: make(map[string]*Client),
		register: make(chan *Client, 256),
		unregister: make(chan *Client, 256),
		route: make(chan WSMessage, 256),
	}
}

func (h *Hub) run() {
	for{
		select{
		case client := <- h.register:
			h.clients[client.userID] = client

		case client := <- h.unregister:
			if c, ok := h.clients[client.userID]; ok && c == client {
				delete(h.clients, client.userID)
				close(client.send)
			}

		case msg := <- h.route:
			payload, err := json.Marshal(msg)
			if err != nil {
				log.Printf("[Error] JSON encoding error: %s",err)
				continue
			}

			switch msg.Type{
			case "message":
				if msg.Message == nil {
					continue
				}

				if c, ok := h.clients[msg.Message.SenderID]; ok {
					select{
					case c.send <- payload:
					default:
						close(c.send)
						delete(h.clients, msg.Message.SenderID)
					}
				}

				if c, ok := h.clients[msg.Message.ReceiverID]; ok {
					select{
					case c.send <- payload:
					default:
						close(c.send)
						delete(h.clients, msg.Message.ReceiverID)
					}
				}

			case "read":
				if msg.Read == nil {
					continue
				}

				if c, ok := h.clients[msg.Read.OtherID]; ok {
					select{
					case c.send <- payload:
					default:
						close(c.send)
						delete(h.clients, msg.Read.OtherID)
					}
				}
			}
		}
	}
}

