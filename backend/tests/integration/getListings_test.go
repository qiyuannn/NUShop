package integrationTest

import (
	"backend/auth"
	db "backend/database"
	"backend/handlers/listings"
	"backend/response"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestGetListing_Authenticated_Owner(t *testing.T) { 
	// Should return listing + NOT run track search
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

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.OptionalAuthHandler())
	r.GET("/listings/:listingID", listings.GetListing)

	req := httptest.NewRequest(http.MethodGet, "/listings/" + listingID, nil)
	req.Header.Set("Authorization", "Bearer " + token)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rr.Code, rr.Body.String())
	}

	var count int
	err = db.Pool.QueryRow(
		context.Background(),
		`SELECT COUNT(*) FROM events`,
	).Scan(&count)
	if err != nil {
		t.Fatal(err)
	}

	if count != 0 {
		t.Fatalf("expected tracksearch count = 0. Tracksearch count: %d", count)
	}
}

func TestGetListing_Authenticated_NotOwner(t *testing.T) {
	// Should return listing + run track search
	userIDStr := seedUser(t)

	listingID := SeedListing(t, userIDStr)

	userIDStr2 := seedUser(t)
	userID2, err := uuid.Parse(userIDStr2)
	if err != nil {
		t.Fatal(err)
	}

	token, err := auth.GenerateAccessToken(userID2)
	if err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.OptionalAuthHandler())
	r.GET("/listings/:listingID", listings.GetListing)

	req := httptest.NewRequest(http.MethodGet, "/listings/" + listingID, nil)
	req.Header.Set("Authorization", "Bearer " + token)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rr.Code, rr.Body.String())
	}

	var count int
	err = db.Pool.QueryRow(
		context.Background(),
		`SELECT COUNT(*) FROM events`,
	).Scan(&count)
	if err != nil {
		t.Fatal(err)
	}

	if count != 1 {
		t.Fatalf("expected tracksearch count = 1. Tracksearch count: %d", count)
	}
}

func TestGetListing_NotAuthenticated(t *testing.T) {
	// Should return listing + NOT run track search
}

func TestGetListing_DontExists(t *testing.T) {
	// Should return not found
}
 