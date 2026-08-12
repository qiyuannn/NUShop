package integrationTest

import (
	"backend/auth"
	db "backend/database"
	"backend/response"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestAuthRefresh_valid(t *testing.T) {
	userIDStr := seedUser(t)

	token, _ := seedRefreshToken(t, userIDStr)
	
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/auth/refresh", auth.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")

	isProd := os.Getenv("ENV") == "production"
	req.AddCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   isProd,
	})

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func seedRefreshToken(t *testing.T, userIDStr string) (string, string) {
	t.Helper()

	tokenID := uuid.NewString()
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		t.Fatal(err)
	}

	newToken, err := auth.GenerateRefreshToken(userID, tokenID)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.Pool.Exec(
		context.Background(),
		`INSERT INTO refresh_tokens (
		id, user_id) VALUES ($1, $2)`,
		tokenID, userIDStr,
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		_, _ = db.Pool.Exec(
			context.Background(),
			`DELETE FROM refresh_tokens WHERE id = $1`,
			tokenID,
		)
	})

	return newToken, tokenID
}

func TestAuthRefresh_expired(t *testing.T) {
	userIDStr := seedUser(t)

	token, _ := seedRefreshToken_expired(t, userIDStr)
	
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/auth/refresh", auth.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")

	isProd := os.Getenv("ENV") == "production"
	req.AddCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   isProd,
	})

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func seedRefreshToken_expired(t *testing.T, userIDStr string) (string, string) {
	t.Helper()

	tokenID := uuid.NewString()
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		t.Fatal(err)
	}

	newToken, err := auth.GenerateRefreshToken(userID, tokenID)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.Pool.Exec(
		context.Background(),
		`INSERT INTO refresh_tokens (
		id, user_id, revoked_on) VALUES ($1, $2, $3)`,
		tokenID, userIDStr, time.Now(),
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		_, _ = db.Pool.Exec(
			context.Background(),
			`DELETE FROM refresh_tokens WHERE id = $1`,
			tokenID,
		)
	})

	return newToken, tokenID
}

func TestAuthRefresh_invalid(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/auth/refresh", auth.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")

	isProd := os.Getenv("ENV") == "production"
	req.AddCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    "test",
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   isProd,
	})

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d, body=%s", rr.Code, rr.Body.String())
	}
}