package chat

import (
	"backend/models"
	"encoding/json"
	"log"
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
			log.Printf(">>> registered client: %s", client.userID)
		case client := <- h.unregister:
			delete(h.clients, client.userID)
			log.Printf(">>> 1. unregistered client: %s", client.userID)
		case message := <- h.route:
			
			if sender, ok := h.clients[message.SenderID]; ok {
				log.Printf(">>> sender FOUND: %s", message.SenderID)
				payload, _ := json.Marshal(models.WSRespnse{
					Type: "message",
					ChatID: message.ReceiverID,
					Message: message,
				})
				select{
				case sender.send <- payload:
				default:
					close(sender.send)
					delete(h.clients, sender.userID)
					log.Printf(">>> 2. unregistered client: %s", sender.userID)
				}
			} else {
				log.Printf(">>> sender NOT FOUND: %s", message.SenderID)
			}

			
			if message.ReceiverID != message.SenderID {
				log.Printf(">>> receiver FOUND: %s", message.ReceiverID)
				if receiver, ok := h.clients[message.ReceiverID]; ok {
					payload, _ := json.Marshal(models.WSRespnse{
						Type: "message",
						ChatID: message.SenderID,
						Message: message,
					})
					select{
					case receiver.send <- payload:
					default:
						close(receiver.send)
						delete(h.clients, receiver.userID)
						log.Printf(">>> 3. unregistered client: %s", receiver.userID)
					}
				}
			} else {
				log.Printf(">>> receiver NOT FOUND: %s", message.ReceiverID)
			}
		}
	}
}