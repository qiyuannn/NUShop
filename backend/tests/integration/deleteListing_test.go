package integrationTest

import (
	"backend/auth"
	"backend/handlers/listings"
	"backend/response"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestDeleteListing_ByOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.DELETE("/listings/:id", listings.DeleteListing)

	userIDStr := seedUser(t)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		t.Fatal(err)
	}

	listingID := SeedListing(t, userIDStr)
	token, err := auth.GenerateAccessToken(userID)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/listings/" + listingID, nil)
	req.Header.Set("Authorization", `Bearer ` + token)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
	t.Fatalf("expected 200, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func TestDeleteListing_NotByOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.DELETE("/listings/:id", listings.DeleteListing)

	userIDStr := seedUser(t)

	listingID := SeedListing(t, userIDStr)
	token, err := auth.GenerateAccessToken(uuid.New())
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/listings/" + listingID, nil)
	req.Header.Set("Authorization", `Bearer ` + token)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
	t.Fatalf("expected 404, got %d, body=%s", rr.Code, rr.Body.String())
	}
}