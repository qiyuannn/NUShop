package cart_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/handlers/cart"
	"backend/response"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupCartTestRouter(withUser bool, customUserID string) *gin.Engine {
	r := gin.New()
	r.Use(response.ErrorHandler())
	if withUser {
		r.Use(func(c *gin.Context) {
			c.Set("userID", customUserID)
			c.Next()
		})
	}
	r.POST("/cart", cart.AddToCart)
	r.DELETE("/cart", cart.DeleteFromCart)
	return r
}

func TestAddToCartValidation(t *testing.T) {
	t.Run("returns 401 when user is not in context", func(t *testing.T) {
		r := setupCartTestRouter(false, "")
		body, _ := json.Marshal(map[string]any{
			"listingID": "123",
			"quantity":  1,
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/cart", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 401 when userID in context is invalid UUID", func(t *testing.T) {
		r := setupCartTestRouter(true, "not-a-valid-uuid")
		body, _ := json.Marshal(map[string]any{
			"listingID": "123",
			"quantity":  1,
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/cart", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 400 when quantity is zero or negative", func(t *testing.T) {
		validUUID := "00000000-0000-0000-0000-000000000001"
		r := setupCartTestRouter(true, validUUID)
		body, _ := json.Marshal(map[string]any{
			"listingID": "123",
			"quantity":  0, // violates binding:"gt=0"
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/cart", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}

func TestDeleteFromCartValidation(t *testing.T) {
	t.Run("returns 401 when user is not authenticated", func(t *testing.T) {
		r := setupCartTestRouter(false, "")
		body, _ := json.Marshal(map[string]any{
			"listingID": "123",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodDelete, "/cart", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 401 when userID is invalid UUID", func(t *testing.T) {
		r := setupCartTestRouter(true, "invalid-uuid")
		body, _ := json.Marshal(map[string]any{
			"listingID": "123",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodDelete, "/cart", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestGetCartValidation(t *testing.T) {
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.GET("/cart", cart.GetCart)

	t.Run("returns 401 when user is not logged in", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/cart", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 401 when user context is not valid UUID", func(t *testing.T) {
		router := gin.New()
		router.Use(response.ErrorHandler())
		router.GET("/cart", func(c *gin.Context) {
			c.Set("userID", "invalid-uuid-format")
			cart.GetCart(c)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/cart", nil)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}
