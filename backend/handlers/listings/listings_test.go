package listings_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/handlers/listings"
	"backend/response"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupListingsRouter(withUser bool, customUserID string) *gin.Engine {
	r := gin.New()
	r.Use(response.ErrorHandler())
	if withUser {
		r.Use(func(c *gin.Context) {
			c.Set("userID", customUserID)
			c.Next()
		})
	}
	r.POST("/listings", listings.CreateListing)
	r.PUT("/listings/:id", listings.UpdateListing)
	r.DELETE("/listings/:id", listings.DeleteListing)
	return r
}

func TestListingValidation(t *testing.T) {
	validUUID := "00000000-0000-0000-0000-000000000001"

	t.Run("CreateListing rejects unauthenticated requests", func(t *testing.T) {
		r := setupListingsRouter(false, "")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/listings", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("CreateListing rejects invalid user UUID context", func(t *testing.T) {
		r := setupListingsRouter(true, "not-a-uuid")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/listings", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})

	t.Run("CreateListing rejects negative price", func(t *testing.T) {
		r := setupListingsRouter(true, validUUID)

		var b bytes.Buffer
		wtr := multipart.NewWriter(&b)
		_ = wtr.WriteField("title", "Test Item")
		_ = wtr.WriteField("price", "-10") // violates gte=0
		_ = wtr.WriteField("quantity", "1")
		_ = wtr.Close()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/listings", &b)
		req.Header.Set("Content-Type", wtr.FormDataContentType())
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("CreateListing rejects negative quantity", func(t *testing.T) {
		r := setupListingsRouter(true, validUUID)

		var b bytes.Buffer
		wtr := multipart.NewWriter(&b)
		_ = wtr.WriteField("title", "Test Item")
		_ = wtr.WriteField("price", "50")
		_ = wtr.WriteField("quantity", "-5") // violates gte=0
		_ = wtr.Close()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/listings", &b)
		req.Header.Set("Content-Type", wtr.FormDataContentType())
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("UpdateListing rejects unauthenticated requests", func(t *testing.T) {
		r := setupListingsRouter(false, "")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPut, "/listings/123", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("DeleteListing rejects unauthenticated requests", func(t *testing.T) {
		r := setupListingsRouter(false, "")
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodDelete, "/listings/123", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestGetListingsV3QueryValidation(t *testing.T) {
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.GET("/listings", listings.GetListingsV3)
	r.GET("/listings/manage", listings.GetListingsV3)

	t.Run("rejects minPrice greater than maxPrice", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/listings?minPrice=100&maxPrice=50", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects limit greater than 100", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/listings?limit=250", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects limit less than 1", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/listings?limit=0", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("manage listings rejects unauthenticated requests", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/listings/manage", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}
