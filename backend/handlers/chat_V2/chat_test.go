package chatv2_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	chatv2 "backend/handlers/chat_V2"
	"backend/response"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupChatRouter(withUser bool, customUserID string) *gin.Engine {
	r := gin.New()
	r.Use(response.ErrorHandler())
	if withUser {
		r.Use(func(c *gin.Context) {
			c.Set("userID", customUserID)
			c.Next()
		})
	}
	r.GET("/chats", chatv2.GetChats)
	r.GET("/chat/history/:listingID/:otherID", chatv2.GetChatHistory)
	r.GET("/chat/info/:listingID/:id1", chatv2.GetChatInfo)
	r.GET("/chat/info/:listingID/:id1/:id2", chatv2.GetChatInfo)
	return r
}

func TestGetChatsAuthValidation(t *testing.T) {
	t.Run("returns 401 when unauthenticated", func(t *testing.T) {
		r := setupChatRouter(false, "")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chats", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 401 when userID is invalid UUID", func(t *testing.T) {
		r := setupChatRouter(true, "not-a-uuid")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chats", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestGetChatHistoryValidation(t *testing.T) {
	validUUID1 := "00000000-0000-0000-0000-000000000001"
	validUUID2 := "00000000-0000-0000-0000-000000000002"

	t.Run("returns 401 when unauthenticated", func(t *testing.T) {
		r := setupChatRouter(false, "")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chat/history/item1/"+validUUID2, nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 400 when otherID is invalid UUID", func(t *testing.T) {
		r := setupChatRouter(true, validUUID1)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chat/history/item1/invalid-uuid", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("returns 400 when attempting to chat with oneself", func(t *testing.T) {
		r := setupChatRouter(true, validUUID1)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chat/history/item1/"+validUUID1, nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}

func TestGetChatInfoValidation(t *testing.T) {
	validUUID1 := "00000000-0000-0000-0000-000000000001"
	validUUID2 := "00000000-0000-0000-0000-000000000002"
	listingUUID := "00000000-0000-0000-0000-000000000003"
	unrelatedUUID := "00000000-0000-0000-0000-000000000004"

	t.Run("returns 400 when listingID is not a valid UUID", func(t *testing.T) {
		r := setupChatRouter(true, validUUID1)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chat/info/not-a-uuid/"+validUUID2, nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("returns 400 when participant id1 is not a valid UUID", func(t *testing.T) {
		r := setupChatRouter(true, validUUID1)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chat/info/"+listingUUID+"/not-a-uuid", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("returns 401 when current user is not a participant in a 2-participant chat", func(t *testing.T) {
		r := setupChatRouter(true, unrelatedUUID)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/chat/info/"+listingUUID+"/"+validUUID1+"/"+validUUID2, nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}
