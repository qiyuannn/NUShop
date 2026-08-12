package integrationTest

import (
	"backend/auth"
	db "backend/database"
	"backend/response"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func TestLogin(t *testing.T) {
	// Seeding data into database
	seedUser(t)

	// Creates a new gin instance, attach Error middleware, and creates a new gin endpoint
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/login", auth.Login)

	// Creates a new http request
	body := `{"email":"test@gmail.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	// sends http request to gin endpoint
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)
	
	// Assert http response
	if rr.Code != http.StatusOK {
		t.Fatalf(`expected 200, got %d`, rr.Code)
	}
}

func TestLogin_InvalidPassword(t *testing.T) {
	seedUser(t)
	
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/login", auth.Login)

	body := `{"email":"test@gmail.com","password":"passwordFake"}`
	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)
	
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func TestLogin_NonExistentUser(t *testing.T) {
	seedUser(t)
	
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(response.ErrorHandler())
	r.POST("/login", auth.Login)

	body := `{"email":"testFake@gmail.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)
	
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func seedUser(t *testing.T) string {
	t.Helper()

	passwordHash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal(err)
	}

	var id string
	err = db.Pool.QueryRow(
		context.Background(),
		`INSERT INTO users (email, username, password_hash) 
		VALUES ($1, $2, $3)
		RETURNING id`,
		"test@gmail.com", "testUser", passwordHash,
	).Scan(&id)
	if err != nil {
		t.Fatal(err)
	}

	// Cleanup function - this registers a function that go would automatically call after the test finishes.
	t.Cleanup(func() {
		_, _ = db.Pool.Exec(
			context.Background(),
			`DELETE FROM users WHERE email = $1`,
			"test@gmail.com",
		)
	})

	return id
}