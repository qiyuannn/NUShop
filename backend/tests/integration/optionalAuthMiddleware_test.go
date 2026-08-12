package integrationTest

import (
	"backend/auth"
	"backend/response"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)
type OptionalAuthTestResp struct {
		UserID string `json:"userID"`
}

func TestOptionalAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(auth.OptionalAuthHandler())
	r.Use(response.ErrorHandler())
	r.GET("/test", func(ctx *gin.Context) {
		userID, exists := ctx.Get("userID")
		if !exists {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "missing userID"})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"userID" : userID})
	})

	userID := uuid.New()
	accessToken, err := auth.GenerateAccessToken(userID)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", `Bearer ` + accessToken)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rr.Code, rr.Body.String())
	}

	var resp OptionalAuthTestResp
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	respUserID := resp.UserID
	if respUserID != userID.String() {
		t.Fatalf("expected userID %s, got %s", userID.String(), respUserID)
	}
}

func TestOptionalAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(auth.OptionalAuthHandler())
	r.Use(response.ErrorHandler())
	r.GET("/test", func(ctx *gin.Context) {
		userID, exists := ctx.Get("userID")
		if !exists {
			userID = ""
		}
		ctx.JSON(http.StatusOK, gin.H{"userID" : userID})
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", `Bearer ` + "invalidtoken")

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rr.Code, rr.Body.String())
	}

	var resp OptionalAuthTestResp
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	respUserID := resp.UserID
	if respUserID != "" {
		t.Fatalf("expected userID %s, got %s", "to be empty", respUserID)
	}
}