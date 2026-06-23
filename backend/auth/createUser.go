package auth

import (
	db "backend/database"
	"backend/response"
	"errors"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type AccountCreationRequest struct {
	Email             string `json:"email"`
	Username          string `json:"username"`
	Password          string `json:"password"`
	VerificationToken string `json:"verificationToken"`
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

	email := strings.ToLower(strings.TrimSpace(request.Email))
	username := strings.TrimSpace(request.Username)
	password := request.Password

	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9._]{3,30}$`)

	if !usernameRegex.MatchString(username) {
		c.Error(response.ErrBadRequest(errors.New(
			"username must be 3-30 characters and contain only letters, numbers, dots and underscores",
		)))
		return
	}

	if len(password) < 8 {
		c.Error(response.ErrBadRequest(errors.New(
			"password must be at least 8 characters",
		)))
		return
	}

	hasUpper := false
	hasLower := false
	hasNumber := false

	for _, ch := range password {
		switch {
		case ch >= 'A' && ch <= 'Z':
			hasUpper = true
		case ch >= 'a' && ch <= 'z':
			hasLower = true
		case ch >= '0' && ch <= '9':
			hasNumber = true
		}
	}

	if !hasUpper || !hasLower || !hasNumber {
		c.Error(response.ErrBadRequest(errors.New(
			"password must contain at least one uppercase letter, one lowercase letter and one number",
		)))
		return
	}

	if email == "" || !strings.Contains(email, "@") {
		c.Error(response.ErrBadRequest(errors.New("Invalid email")))
		return
	}
	if username == "" {
		c.Error(response.ErrBadRequest(errors.New("Username required")))
		return
	}
	if password == "" {
		c.Error(response.ErrBadRequest(errors.New("Password required")))
		return
	}
	if request.VerificationToken == "" {
		c.Error(response.ErrBadRequest(errors.New("Missing verification token")))
		return
	}

	signupSecret := os.Getenv("SignupTokenSecret")
	if signupSecret == "" {
		signupSecret = os.Getenv("AccessTokenSecret")
	}
	if signupSecret == "" {
		c.Error(response.ErrInternalServerError(errors.New("Signup token secret not set")))
		return
	}

	token, err := jwt.ParseWithClaims(
		request.VerificationToken,
		&jwt.RegisteredClaims{},
		func(token *jwt.Token) (any, error) {
			return []byte(signupSecret), nil
		},
	)
	if err != nil || !token.Valid {
		c.Error(response.ErrUnauthorised(errors.New("Invalid verification token")))
		return
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || claims.Subject != email {
		c.Error(response.ErrUnauthorised(errors.New("Verification token mismatch")))
		return
	}
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		c.Error(response.ErrUnauthorised(errors.New("Verification token expired")))
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	var user struct {
		ID           string
		FirstName    string
		LastName     string
		Username     string
		Email        string
		PasswordHash string
		CreatedOn    time.Time
	}

	err = db.Pool.QueryRow(
		c.Request.Context(),
		`INSERT INTO users (
			first_name,
			last_name,
			username,
			email,
			password_hash
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING
			id,
			first_name,
			last_name,
			username,
			email,
			password_hash,
			created_on`,
		username,
		"",
		username,
		email,
		string(passwordHash),
	).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedOn,
	)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			switch pgErr.Code {
			case "23505":
				switch pgErr.ConstraintName {
				case "users_email_key":
					c.Error(response.ErrStatusConflict(errors.New("email already in use")))
				case "users_username_key":
					c.Error(response.ErrStatusConflict(errors.New("username already in use")))
				default:
					c.Error(response.ErrStatusConflict(errors.New("email or username already in use")))
				}
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

	tokenOut, err := issueSession(c, user.ID)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	response.Success(c, http.StatusCreated, gin.H{
		"user": gin.H{
			"id":        user.ID,
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"username":  user.Username,
			"email":     user.Email,
			"createdOn": user.CreatedOn,
		},
		"token": tokenOut,
	})
}
