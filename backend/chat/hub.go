package chat

import (
	"backend/models"
	"encoding/json"
)

type Hub struct {
	clients map[string]*Client
	register chan *Client
	unregister chan *Client
	route chan *models.Message
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]*Client),
		register: make(chan *Client, 256),
		unregister: make(chan *Client, 256),
		route: make(chan *models.Message, 256),
	}
}

func (h *Hub) Run() {
	for{
		select{
		case client := <- h.register:
			h.clients[client.userID] = client
		case client := <- h.unregister:
			delete(h.clients, client.userID)
		case message := <- h.route:
			payload, _ := json.Marshal(models.WSRespnse{
				Type: "message",
				Message: message,
			})

			if sender, ok := h.clients[message.SenderID]; ok {
				select{
				case sender.send <- payload:
				default:
					close(sender.send)
					delete(h.clients, sender.userID)
				}
			}

			if receiver, ok := h.clients[message.ReceiverID]; ok {
				select{
				case receiver.send <- payload:
				default:
					close(receiver.send)
					delete(h.clients, receiver.userID)
				}
			}
		}
	}
}