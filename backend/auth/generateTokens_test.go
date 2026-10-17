package auth_test

import (
	"os"
	"testing"
	"time"

	"backend/auth"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestGenerateAccessToken(t *testing.T) {
	secret := "test-secret-key-12345"
	_ = os.Setenv("AccessTokenSecret", secret)
	defer os.Unsetenv("AccessTokenSecret")

	userID := uuid.New()
	tokenStr, err := auth.GenerateAccessToken(userID)
	if err != nil {
		t.Fatalf("unexpected error generating access token: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("generated token string is empty")
	}

	// Parse and verify token claims
	token, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse token: %v", err)
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		t.Fatalf("token is invalid")
	}

	if claims.Subject != userID.String() {
		t.Errorf("subject = %s; want %s", claims.Subject, userID.String())
	}
	if claims.Issuer != "NUShop" {
		t.Errorf("issuer = %s; want NUShop", claims.Issuer)
	}
	if claims.ExpiresAt == nil || claims.ExpiresAt.Time.Before(time.Now()) {
		t.Errorf("expected future expiration time")
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	secret := "test-refresh-secret-12345"
	_ = os.Setenv("RefreshTokenSecret", secret)
	defer os.Unsetenv("RefreshTokenSecret")

	userID := uuid.New()
	tokenID := "session-uuid-test"
	tokenStr, err := auth.GenerateRefreshToken(userID, tokenID)
	if err != nil {
		t.Fatalf("unexpected error generating refresh token: %v", err)
	}

	token, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse refresh token: %v", err)
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		t.Fatalf("refresh token is invalid")
	}

	if claims.Subject != userID.String() {
		t.Errorf("subject = %s; want %s", claims.Subject, userID.String())
	}
	if claims.ID != tokenID {
		t.Errorf("ID = %s; want %s", claims.ID, tokenID)
	}
}
