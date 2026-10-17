package payments

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"backend/response"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func makeStripeSignature(payload []byte, secret string, t int64) string {
	signedPayload := fmt.Sprintf("%d.%s", t, payload)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedPayload))
	sigHex := hex.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("t=%d,v1=%s", t, sigHex)
}

func TestVerifyStripeSignature(t *testing.T) {
	secret := "whsec_test_secret_key"
	payload := []byte(`{"id":"evt_123","type":"checkout.session.completed"}`)
	now := time.Now().Unix()

	t.Run("valid signature passes verification", func(t *testing.T) {
		header := makeStripeSignature(payload, secret, now)
		err := verifyStripeSignature(payload, header, secret, 5*time.Minute)
		if err != nil {
			t.Fatalf("expected valid signature, got: %v", err)
		}
	})

	t.Run("missing signature header returns error", func(t *testing.T) {
		err := verifyStripeSignature(payload, "", secret, 5*time.Minute)
		if err == nil || err.Error() != "missing Stripe-Signature header" {
			t.Fatalf("expected missing header error, got: %v", err)
		}
	})

	t.Run("malformed signature header returns error", func(t *testing.T) {
		err := verifyStripeSignature(payload, "invalid_header", secret, 5*time.Minute)
		if err == nil || err.Error() != "invalid Stripe-Signature header" {
			t.Fatalf("expected invalid header error, got: %v", err)
		}
	})

	t.Run("signature outside tolerance returns error", func(t *testing.T) {
		oldTime := time.Now().Add(-10 * time.Minute).Unix()
		header := makeStripeSignature(payload, secret, oldTime)
		err := verifyStripeSignature(payload, header, secret, 5*time.Minute)
		if err == nil || err.Error() != "Stripe-Signature timestamp outside tolerance" {
			t.Fatalf("expected timestamp outside tolerance error, got: %v", err)
		}
	})

	t.Run("tampered payload fails verification", func(t *testing.T) {
		header := makeStripeSignature(payload, secret, now)
		tamperedPayload := []byte(`{"id":"evt_TAMPERED"}`)
		err := verifyStripeSignature(tamperedPayload, header, secret, 5*time.Minute)
		if err == nil || err.Error() != "invalid Stripe signature" {
			t.Fatalf("expected invalid signature error, got: %v", err)
		}
	})

	t.Run("wrong secret fails verification", func(t *testing.T) {
		header := makeStripeSignature(payload, "wrong_secret", now)
		err := verifyStripeSignature(payload, header, secret, 5*time.Minute)
		if err == nil || err.Error() != "invalid Stripe signature" {
			t.Fatalf("expected invalid signature error, got: %v", err)
		}
	})
}

func TestHandleStripeWebhookValidation(t *testing.T) {
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/webhook", HandleStripeWebhook)

	t.Run("returns 500 when STRIPE_WEBHOOK_SECRET is missing", func(t *testing.T) {
		_ = os.Unsetenv("STRIPE_WEBHOOK_SECRET")

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/webhook", bytes.NewBuffer([]byte(`{}`)))
		r.ServeHTTP(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})

	t.Run("returns 400 when Stripe-Signature header is missing", func(t *testing.T) {
		_ = os.Setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")
		defer os.Unsetenv("STRIPE_WEBHOOK_SECRET")

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/webhook", bytes.NewBuffer([]byte(`{}`)))
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}

func TestCreateStripeCheckoutSessionValidation(t *testing.T) {
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/checkout", CreateStripeCheckoutSession)

	t.Run("returns 401 when user is not logged in", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/checkout", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 401 when userID is invalid UUID", func(t *testing.T) {
		router := gin.New()
		router.Use(response.ErrorHandler())
		router.POST("/checkout", func(c *gin.Context) {
			c.Set("userID", "bad-uuid")
			CreateStripeCheckoutSession(c)
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/checkout", nil)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}
