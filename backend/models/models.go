package models

import (
	"time"
)

type User struct {
	ID         string `json:"id"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"passwordHash"`
	CreatedOn    time.Time `json:"createdOn"`
}

type Listing struct {
	ID         string `json:"id"`
	SellerID   string `json:"sellerID"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Price        int64     `json:"price" binding:"gte=0"`
	Quantity     int64     `json:"quantity" binding:"gte=0"`
	Condition    string    `json:"condition"`
	CategoryName string `json:"categoryName"`
	CreatedOn    time.Time `json:"createdOn"`
	Images       []string  `json:"images"`
}

type Image struct {
	ID string `json:"uuid"`
	SellerUUID string `json:"sellerID"`
	FilePath string `json:"filePath"`
}

type Cart struct {
	UserID string `json:"userID"`
	ListingID string `json:"listingID"`
	Quantity int `json:"quanitity"`
}

type Message struct {
	ID string `json:"id"`
	SenderID string `json:"senderID"`
	ReceiverID string `json:"receiverID"`
	Content string `json:"content"`
	Read string `json:"read"`
	CreatedOn time.Time `json:"createdOn"`
}

type WSMessage struct {
	Type string `json:"type"`
	SenderID string `json:"senderID"`
	ReceiverID string `json:"receiverID"`
	Content string `json:"content"`
	MessageID string `json:"messageID,omitempty"`
}

type WSRespnse struct {
	Type string `json:"type"`
	Message *Message `json:"message,omitempty"`
	Error string `json:"error,omitempty"`
}