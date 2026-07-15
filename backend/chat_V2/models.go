package chatv2

import "time"

type WSMessage struct {
	Type string `json:"type"`
	Message *Mesage `json:"message,omitempty"`
	Read *Read `json:"read,omitempty"`
}

type Mesage struct {
	ID string `json:"id,omitempty"`
	SenderID string `json:"senderID,omitempty"`
	ReceiverID string `json:"receiverID"`
	ListingID string `json:"listingID"`
	Content string `json:"content"`
	CreatedOn time.Time `json:"createdOn,omitempty"`
}

type Read struct {
	UserID string `json:"userID"`
	OtherID string `json:"otherID"`
	ListingID string `json:"listingID"`
	LastReadID string `json:"lastReadID"`
}