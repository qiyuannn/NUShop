package integrationTest

import (
	"backend/auth"
	db "backend/database"
	"backend/handlers/listings"
	"backend/response"
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestEditListing_ByOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.POST("/listings/:id", listings.UpdateListing)

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

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	writer.WriteField("test", "2")
	writer.WriteField("price", "2")
	writer.WriteField("quantity", "2")
	writer.WriteField("condition", "Brand New")
	writer.WriteField("category", "Others")

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/listings/" + listingID, &body)
	req.Header.Set("Authorization", `Bearer ` + token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 401, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func TestEditListing_NotByOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.POST("/listings/:id", listings.UpdateListing)

	userIDStr := seedUser(t)

	listingID := SeedListing(t, userIDStr)

	token, err := auth.GenerateAccessToken(uuid.New())
	if err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	writer.WriteField("test", "2")
	writer.WriteField("price", "2")
	writer.WriteField("quantity", "2")
	writer.WriteField("condition", "Brand New")
	writer.WriteField("category", "Others")

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/listings/" + listingID, &body)
	req.Header.Set("Authorization", `Bearer ` + token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
	t.Fatalf("expected 404, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func SeedListing(t *testing.T, userID string) string {
	var listingID string
	err := db.Pool.QueryRow(
		context.Background(),
		`INSERT INTO listings (
			seller_id,
			title,
			description,
			price,
			quantity, 
			condition,
			category_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id`,
		 userID, 
		 "test",
		 "test",
		 1,
		 1,
		 "Brand New",
		 "Others",
	).Scan(&listingID)

	if err != nil {
		t.Fatal(err)
	}

	return listingID
}