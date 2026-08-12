package integrationTest

import (
	"backend/auth"
	"backend/handlers/listings"
	"backend/response"
	"bytes"
	"log"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestCreateListing(t *testing.T) {
	userIDStr := seedUser(t)
	
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.POST("/listings", listings.CreateListing)


	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Fatal(err)
	}
	accessToken, err := auth.GenerateAccessToken(userID)
	if err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	writer.WriteField("id", userIDStr)
	writer.WriteField("test", "test")
	writer.WriteField("price", "1")
	writer.WriteField("quantity", "1")
	writer.WriteField("condition", "Brand New")
	writer.WriteField("category", "Others")

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/listings", &body)
	req.Header.Set("Authorization", `Bearer `+accessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreateListing_NotAuthenticated(t *testing.T) {
	userIDStr := seedUser(t)
	
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.POST("/listings", listings.CreateListing)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	writer.WriteField("id", userIDStr)
	writer.WriteField("test", "test")
	writer.WriteField("price", "1")
	writer.WriteField("quantity", "1")
	writer.WriteField("condition", "Brand New")
	writer.WriteField("category", "Others")

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/listings", &body)
	req.Header.Set("Authorization", `Bearer `)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d, body=%s", rr.Code, rr.Body.String())
	}
}