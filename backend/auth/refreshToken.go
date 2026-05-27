package auth

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type RefreshTokenStruct struct {
	Uuid       uuid.UUID
	UserUUID   uuid.UUID
	ExpOn      time.Time
	CreatedOn  time.Time
	RevokedOn  *time.Time
	ReplacedBy *uuid.UUID
}

func RefreshToken(c *gin.Context) {
	refreshTokenStr, err := c.Cookie("refresh_token")
	if err != nil {
		c.Error(response.ErrNotFound(err))
		return
	}

	claims := &jwt.RegisteredClaims{}
	secret := os.Getenv("RefreshTokenSecret")

	refreshToken, err := jwt.ParseWithClaims(
		refreshTokenStr,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("invalid token")
			}
			return []byte(secret), nil
		},
		jwt.WithIssuer("NUShop"),
		jwt.WithIssuedAt(),
		jwt.WithExpirationRequired(),
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
	)
	if err != nil || !refreshToken.Valid {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	var t RefreshTokenStruct
	if err := db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT uuid, user_uuid, exp_on, created_on, revoked_on, replaced_by
		FROM refresh_tokens WHERE uuid = $1`,
		claims.ID,
	).Scan(&t.Uuid, &t.UserUUID, &t.ExpOn, &t.CreatedOn, &t.RevokedOn, &t.ReplacedBy); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.Error(response.ErrNotFound(err))
			return
		}
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if t.ExpOn.Before(time.Now()) || t.RevokedOn != nil || t.ReplacedBy != nil {
		c.Error(response.ErrUnauthorised(errors.New("token expired")))
		return
	}

	//generate new token
	newTokenUUID := uuid.NewString()
	newToken, err := GenerateRefreshToken(t.UserUUID, newTokenUUID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	//insert new token
	if _, err := db.Pool.Exec(
		c.Request.Context(),
		`INSERT INTO refresh_tokens (
		uuid, user_uuid) VALUES ($1, $2)`,
		newTokenUUID, t.UserUUID,
	); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	//revoke old token
	res, err := db.Pool.Exec(
		c.Request.Context(),
		`UPDATE refresh_tokens SET 
		revoked_on = $1,
		replaced_by = $2
		WHERE uuid = $3`,
		time.Now(), newTokenUUID, t.Uuid,
	)
	if err != nil || res.RowsAffected() == 0 {
		c.Error(response.ErrInternalServerError(errors.New("failed to update refresh token")))
		return
	}

	//replace cookie
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    newToken,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	//generate new accesstoken
	newAccessToken, err := GenerateAcessToken(t.UserUUID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	//return accesstoken
	response.Success(c, http.StatusCreated, gin.H{
		"replaced": t.Uuid,
		"tokenID":  newTokenUUID,
		"token":    newAccessToken,
	})
}
