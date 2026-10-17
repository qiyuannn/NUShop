package auth_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"backend/auth"
	"backend/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupAuthRouter() *gin.Engine {
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.Use(auth.AuthHandler())
	r.GET("/protected", func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no user"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"userID": userID})
	})
	return r
}

func setupOptionalAuthRouter() *gin.Engine {
	r := gin.New()
	r.Use(auth.OptionalAuthHandler())
	r.GET("/optional", func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusOK, gin.H{"status": "guest"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "authenticated", "userID": userID})
	})
	return r
}

func TestAuthHandler(t *testing.T) {
	secret := "secret-auth-key-12345"
	_ = os.Setenv("AccessTokenSecret", secret)
	defer os.Unsetenv("AccessTokenSecret")

	router := setupAuthRouter()

	t.Run("rejects request with missing Authorization header", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("rejects request with invalid Bearer format", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Basic 123456")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("rejects request with empty Bearer token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer ")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("rejects request with corrupted token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid.jwt.signature")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("allows request with valid token and extracts userID", func(t *testing.T) {
		userID := uuid.New()
		token, err := auth.GenerateAccessToken(userID)
		if err != nil {
			t.Fatalf("failed to generate access token: %v", err)
		}

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d (body: %s)", http.StatusOK, w.Code, w.Body.String())
		}
	})
}

func TestOptionalAuthHandler(t *testing.T) {
	secret := "secret-auth-key-12345"
	_ = os.Setenv("AccessTokenSecret", secret)
	defer os.Unsetenv("AccessTokenSecret")

	router := setupOptionalAuthRouter()

	t.Run("proceeds as guest when no token provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/optional", nil)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
		}
		if !stringsContains(w.Body.String(), "guest") {
			t.Fatalf("expected guest response, got %s", w.Body.String())
		}
	})

	t.Run("attaches userID when valid token provided", func(t *testing.T) {
		userID := uuid.New()
		token, err := auth.GenerateAccessToken(userID)
		if err != nil {
			t.Fatalf("failed to generate token: %v", err)
		}

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/optional", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
		}
		if !stringsContains(w.Body.String(), "authenticated") {
			t.Fatalf("expected authenticated response, got %s", w.Body.String())
		}
	})
}

func stringsContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && time.Now().Unix() > 0 && (s != "" && contains(s, substr)))
}

func contains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
