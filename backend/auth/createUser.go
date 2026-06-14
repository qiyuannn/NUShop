package auth

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type AccountCreationRequest struct {
	Credential string `json:"credential"`
}

type googleUserRow struct {
	ID           string
	FirstName    string
	LastName     string
	Email        string
	GoogleSub    string
	PasswordHash string
	CreatedOn    time.Time
}

func claimString(claims map[string]interface{}, key string) string {
	if v, ok := claims[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func claimBool(claims map[string]interface{}, key string) bool {
	if v, ok := claims[key]; ok {
		switch val := v.(type) {
		case bool:
			return val
		case string:
			return strings.EqualFold(val, "true")
		}
	}
	return false
}

func splitName(fullName string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(fullName))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

func issueSession(c *gin.Context, userID string) (string, error) {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return "", err
	}

	accessToken, err := GenerateAccessToken(parsedUserID)
	if err != nil {
		return "", err
	}

	refreshTokenID := uuid.NewString()
	refreshToken, err := GenerateRefreshToken(parsedUserID, refreshTokenID)
	if err != nil {
		return "", err
	}

	if _, err := db.Pool.Exec(
		c.Request.Context(),
		`INSERT INTO refresh_tokens (id, user_id) VALUES ($1, $2)`,
		refreshTokenID,
		userID,
	); err != nil {
		return "", err
	}

	isProd := os.Getenv("ENV") == "production"
	cookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   isProd,
	}
	if isProd {
		cookie.SameSite = http.SameSiteNoneMode
	} else {
		cookie.SameSite = http.SameSiteLaxMode
	}
	http.SetCookie(c.Writer, cookie)

	return accessToken, nil
}

func CreateUser(c *gin.Context) {
	var request AccountCreationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	if request.Credential == "" {
		c.Error(response.ErrBadRequest(errors.New("missing google credential")))
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		c.Error(response.ErrInternalServerError(errors.New("GOOGLE_CLIENT_ID not set")))
		return
	}

	payload, err := idtoken.Validate(c.Request.Context(), request.Credential, clientID)
	if err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	email := claimString(payload.Claims, "email")
	if email == "" || !strings.HasSuffix(strings.ToLower(email), "@gmail.com") {
		c.Error(response.ErrBadRequest(errors.New("gmail address required")))
		return
	}
	if !claimBool(payload.Claims, "email_verified") {
		c.Error(response.ErrUnauthorised(errors.New("email not verified by google")))
		return
	}

	firstName := claimString(payload.Claims, "given_name")
	lastName := claimString(payload.Claims, "family_name")
	if firstName == "" && lastName == "" {
		firstName, lastName = splitName(claimString(payload.Claims, "name"))
	}
	if firstName == "" {
		firstName = "Google"
	}

	googleSub := payload.Subject
	if googleSub == "" {
		c.Error(response.ErrUnauthorised(errors.New("missing google subject")))
		return
	}

	var user googleUserRow
	err = db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT id, first_name, last_name, email, google_sub, password_hash, created_on
		 FROM users
		 WHERE google_sub = $1 OR email = $2
		 LIMIT 1`,
		googleSub,
		email,
	).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.GoogleSub,
		&user.PasswordHash,
		&user.CreatedOn,
	)

	switch {
	case err == nil:
		if user.GoogleSub != "" && user.GoogleSub != googleSub {
			c.Error(response.ErrStatusConflict(errors.New("email already linked")))
			return
		}

		if _, err := db.Pool.Exec(
			c.Request.Context(),
			`UPDATE users
			 SET email = $1,
			     first_name = $2,
			     last_name = $3,
			     google_sub = COALESCE(google_sub, $4)
			 WHERE id = $5`,
			email,
			firstName,
			lastName,
			googleSub,
			user.ID,
		); err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				c.Error(response.ErrStatusConflict(errors.New("email already in use")))
				return
			}
			c.Error(response.ErrInternalServerError(err))
			return
		}

		user.Email = email
		user.FirstName = firstName
		user.LastName = lastName
		user.GoogleSub = googleSub

	case errors.Is(err, pgx.ErrNoRows):
		placeholderPassword, err := bcrypt.GenerateFromPassword([]byte(uuid.NewString()), bcrypt.DefaultCost)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		if err := db.Pool.QueryRow(
			c.Request.Context(),
			`INSERT INTO users (
				first_name,
				last_name,
				email,
				google_sub,
				password_hash
			) VALUES ($1, $2, $3, $4, $5) RETURNING
				id,
				first_name,
				last_name,
				email,
				google_sub,
				password_hash,
				created_on`,
			firstName,
			lastName,
			email,
			googleSub,
			placeholderPassword,
		).Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.Email,
			&user.GoogleSub,
			&user.PasswordHash,
			&user.CreatedOn,
		); err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok {
				switch pgErr.Code {
				case "23505":
					c.Error(response.ErrStatusConflict(errors.New("email already in use")))
					return
				case "23502":
					c.Error(response.ErrBadRequest(errors.New("db not null violation")))
					return
				case "23503":
					c.Error(response.ErrBadRequest(errors.New("foreign key violation")))
					return
				case "23514":
					c.Error(response.ErrBadRequest(errors.New("invalid data")))
					return
				}
			}
			c.Error(response.ErrInternalServerError(err))
			return
		}

	default:
		c.Error(response.ErrInternalServerError(err))
		return
	}

	token, err := issueSession(c, user.ID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusCreated, gin.H{
		"user": gin.H{
			"id":        user.ID,
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"createdOn": user.CreatedOn,
		},
		"token": token,
	})
}
