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
)

func TestLogout_Success(t *testing.T) {
	userIDStr := seedUser(t)
	token, tokenID := seedRefreshToken(t, userIDStr)

	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/auth/logout", auth.Logout)

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
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

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rr.Code, rr.Body.String())
	}

	var revoked_on time.Time
	err := db.Pool.QueryRow(
		context.Background(),
		`SELECT revoked_on FROM refresh_tokens
		WHERE id = $1 AND user_id = $2`,
		tokenID, userIDStr,
	).Scan(&revoked_on)
	if err != nil {
		t.Fatal(err)
	}

	if revoked_on.After(time.Now()) {
		t.Fatalf("Failed to revoke token")
	}
}