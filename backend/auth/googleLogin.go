package auth

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"google.golang.org/api/idtoken"
)

type GoogleLoginRequest struct {
	Credential string `json:"credential"`
}

func randomSuffix(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func makeGoogleUsername(email, sub string) string {
	local := strings.Split(email, "@")[0]
	local = strings.ToLower(strings.TrimSpace(local))
	local = strings.ReplaceAll(local, " ", "")
	if local == "" {
		local = "user"
	}
	return local + "_" + sub[:8]
}

func getStringClaim(claims map[string]interface{}, key string) string {
	v, ok := claims[key]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		c.Error(response.ErrInternalServerError(errors.New("GOOGLE_CLIENT_ID not set")))
		return
	}

	payload, err := idtoken.Validate(c.Request.Context(), req.Credential, clientID)
	if err != nil {
		c.Error(response.ErrBadRequest(errors.New("google token validation failed: " + err.Error())))
		return
	}

	email := strings.ToLower(strings.TrimSpace(getStringClaim(payload.Claims, "email")))
	if email == "" || !strings.Contains(email, "@") {
		c.Error(response.ErrUnauthorised(errors.New("missing google email")))
		return
	}

	if verified, ok := payload.Claims["email_verified"].(bool); ok && !verified {
		c.Error(response.ErrUnauthorised(errors.New("google email not verified")))
		return
	}

	googleSub := strings.TrimSpace(payload.Subject)
	if googleSub == "" {
		c.Error(response.ErrUnauthorised(errors.New("missing google subject")))
		return
	}

	firstName := strings.TrimSpace(getStringClaim(payload.Claims, "given_name"))
	lastName := strings.TrimSpace(getStringClaim(payload.Claims, "family_name"))
	if firstName == "" {
		firstName = strings.TrimSpace(getStringClaim(payload.Claims, "name"))
	}
	if firstName == "" {
		firstName = "Google"
	}
	if lastName == "" {
		lastName = "User"
	}

	var user models.User
	err = db.Pool.QueryRow(
		c.Request.Context(),
		`SELECT
			id,
			''::text AS first_name,
			''::text AS last_name,
			username,
			email,
			password_hash,
			created_on
		FROM users
		WHERE google_sub = $1 OR email = $2`,
		googleSub, email,
	).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedOn,
	)

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if errors.Is(err, pgx.ErrNoRows) {
		c.Error(response.ErrBadRequest(
			errors.New("No account exists for this Google email. Please sign up first."),
		))
		return
	}

	userID, err := uuid.Parse(user.ID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	token, err := GenerateAccessToken(userID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	refreshTokenID := uuid.NewString()
	refreshToken, err := GenerateRefreshToken(userID, refreshTokenID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if _, err := db.Pool.Exec(
		c.Request.Context(),
		`INSERT INTO refresh_tokens (id, user_id) VALUES ($1, $2)`,
		refreshTokenID,
		user.ID,
	); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
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

	user.PasswordHash = ""

	response.Success(c, http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}
