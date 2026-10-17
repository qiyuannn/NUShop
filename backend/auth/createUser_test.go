package auth_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"backend/auth"
	"backend/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func generateTestSignupToken(email, secret string, expired bool) string {
	exp := time.Now().Add(10 * time.Minute)
	if expired {
		exp = time.Now().Add(-10 * time.Minute)
	}

	claims := jwt.RegisteredClaims{
		Subject:   email,
		ExpiresAt: jwt.NewNumericDate(exp),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))
	return tokenStr
}

func TestCreateUserValidation(t *testing.T) {
	secret := "test-signup-secret"
	_ = os.Setenv("SignupTokenSecret", secret)
	defer os.Unsetenv("SignupTokenSecret")

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/create_user", auth.CreateUser)

	t.Run("rejects username with invalid characters or length", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":             "test@nus.edu",
			"username":          "ab", // Too short (min 3)
			"password":          "ValidPass1",
			"verificationToken": "dummy",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/create_user", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects password with less than 8 characters", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":             "test@nus.edu",
			"username":          "valid_user",
			"password":          "Short1",
			"verificationToken": "dummy",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/create_user", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects password missing uppercase or numbers", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":             "test@nus.edu",
			"username":          "valid_user",
			"password":          "alllowercaseandnonumber",
			"verificationToken": "dummy",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/create_user", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects invalid email format", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":             "notanemail",
			"username":          "valid_user",
			"password":          "ValidPass1",
			"verificationToken": "dummy",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/create_user", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects invalid verification token", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":             "test@nus.edu",
			"username":          "valid_user",
			"password":          "ValidPass1",
			"verificationToken": "malformed.jwt.token",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/create_user", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("rejects verification token with email mismatch", func(t *testing.T) {
		mismatchedToken := generateTestSignupToken("other@nus.edu", secret, false)
		body, _ := json.Marshal(map[string]string{
			"email":             "test@nus.edu",
			"username":          "valid_user",
			"password":          "ValidPass1",
			"verificationToken": mismatchedToken,
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/create_user", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestResetPasswordValidation(t *testing.T) {
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/reset_password", auth.ResetPassword)

	t.Run("rejects password shorter than 8 chars", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"resetToken": "token",
			"password":   "Short1",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/reset_password", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("rejects password without numbers", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"resetToken": "token",
			"password":   "NoNumbersHere",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/reset_password", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}
