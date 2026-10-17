package chatv2

import (
	"encoding/json"
	"testing"
	"time"
)

func TestHubRegistrationAndRouting(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	clientA := &Client{
		hub:    hub,
		userID: "userA",
		send:   make(chan []byte, 10),
	}
	clientB := &Client{
		hub:    hub,
		userID: "userB",
		send:   make(chan []byte, 10),
	}

	// 1. Register clients
	hub.register <- clientA
	hub.register <- clientB

	time.Sleep(20 * time.Millisecond)

	// 2. Route a chat message from userA to userB
	msg := WSMessage{
		Type: "message",
		Message: &Mesage{
			ID:         "msg-1",
			SenderID:   "userA",
			ReceiverID: "userB",
			ListingID:  "item-123",
			Content:    "Hello User B",
		},
	}
	hub.route <- msg

	// Verify User A receives confirmation/echo
	select {
	case payloadA := <-clientA.send:
		var received WSMessage
		if err := json.Unmarshal(payloadA, &received); err != nil {
			t.Fatalf("failed to decode message for user A: %v", err)
		}
		if received.Message.Content != "Hello User B" {
			t.Errorf("user A received wrong content: %s", received.Message.Content)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for message on client A")
	}

	// Verify User B receives incoming message
	select {
	case payloadB := <-clientB.send:
		var received WSMessage
		if err := json.Unmarshal(payloadB, &received); err != nil {
			t.Fatalf("failed to decode message for user B: %v", err)
		}
		if received.Message.Content != "Hello User B" {
			t.Errorf("user B received wrong content: %s", received.Message.Content)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for message on client B")
	}

	// 3. Route a read receipt
	readMsg := WSMessage{
		Type: "read",
		Read: &Read{
			UserID:     "userB",
			OtherID:    "userA",
			ListingID:  "item-123",
			LastReadID: "msg-1",
		},
	}
	hub.route <- readMsg

	select {
	case payloadRead := <-clientA.send:
		var received WSMessage
		if err := json.Unmarshal(payloadRead, &received); err != nil {
			t.Fatalf("failed to decode read message for user A: %v", err)
		}
		if received.Read.LastReadID != "msg-1" {
			t.Errorf("user A received wrong lastReadID: %s", received.Read.LastReadID)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for read receipt on client A")
	}

	// 4. Unregister client B
	hub.unregister <- clientB
	time.Sleep(20 * time.Millisecond)

	// Sending to unregistered client B shouldn't block or crash
	hub.route <- WSMessage{
		Type: "message",
		Message: &Mesage{
			ID:         "msg-2",
			SenderID:   "userA",
			ReceiverID: "userB",
			ListingID:  "item-123",
			Content:    "Are you there?",
		},
	}

	// Client A still gets their copy
	select {
	case <-clientA.send:
	case <-time.After(1 * time.Second):
		t.Fatal("client A did not receive echo after client B unregistered")
	}
}
