package auth

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func GenerateAcessToken(userUUID uuid.UUID) (string, error) {
	accessTokenSecret := os.Getenv("AccessTokenSecret")

	claims := jwt.RegisteredClaims{
		Issuer: "NUShop",
		Subject: userUUID.String(),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute * 15)),
		IssuedAt: jwt.NewNumericDate(time.Now()),
		ID: uuid.NewString(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(accessTokenSecret))
}

func GenerateRefreshToken(userUUID uuid.UUID, tokenUUID string) (string, error) {
	refreshTokenSecret := os.Getenv("RefreshTokenSecret") 

	claims := jwt.RegisteredClaims{
		Issuer: "NUShop",
		Subject: userUUID.String(),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 168)),
		IssuedAt: jwt.NewNumericDate(time.Now()),
		ID: tokenUUID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(refreshTokenSecret))
}