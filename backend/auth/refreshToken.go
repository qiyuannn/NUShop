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
	ID       uuid.UUID
	UserID   uuid.UUID
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

	tx, err := db.Pool.Begin(c.Request.Context())
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return 
	}

	defer tx.Rollback(c.Request.Context())

	var t RefreshTokenStruct
	if err := tx.QueryRow(
		c.Request.Context(),
		`SELECT id, user_id, exp_on, created_on, revoked_on, replaced_by
		FROM refresh_tokens WHERE id = $1 and user_id = $2`,
		claims.ID, claims.Subject,
	).Scan(&t.ID, &t.UserID, &t.ExpOn, &t.CreatedOn, &t.RevokedOn, &t.ReplacedBy); err != nil {
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
	newTokenID := uuid.NewString()
	newToken, err := GenerateRefreshToken(t.UserID, newTokenID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	//insert new token
	if _, err := tx.Exec(
		c.Request.Context(),
		`INSERT INTO refresh_tokens (
		id, user_id) VALUES ($1, $2)`,
		newTokenID, t.UserID,
	); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	//revoke old token
	res, err := tx.Exec(
		c.Request.Context(),
		`UPDATE refresh_tokens SET 
		revoked_on = $1,
		replaced_by = $2
		WHERE id = $3`,
		time.Now(), newTokenID, t.ID,
	)
	if err != nil || res.RowsAffected() == 0 {
		c.Error(response.ErrInternalServerError(errors.New("failed to update refresh token")))
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	isProd := os.Getenv("ENV") == "production"
	//replace cookie
	cookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    newToken,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   isProd,
	} 
	if (isProd) {
		cookie.SameSite = http.SameSiteNoneMode
	} else {
		cookie.SameSite =http.SameSiteLaxMode
	}

	http.SetCookie(c.Writer, cookie)

	//generate new accesstoken
	newAccessToken, err := GenerateAccessToken(t.UserID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	//return accesstoken
	response.Success(c, http.StatusCreated, gin.H{
		"token":    newAccessToken,
		"userID" : t.UserID,
	})
}
