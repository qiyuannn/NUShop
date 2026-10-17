package response_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/response"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestSuccessResponse(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	data := map[string]string{"message": "ok"}
	response.Success(c, http.StatusOK, data)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var res response.Response
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse json response: %v", err)
	}

	mappedData, ok := res.Data.(map[string]any)
	if !ok || mappedData["message"] != "ok" {
		t.Fatalf("unexpected data: %+v", res.Data)
	}
}

func TestStructuredErrors(t *testing.T) {
	tests := []struct {
		name       string
		errFunc    func(error) *response.AppError
		inputErr   error
		wantStatus int
		wantCode   string
		wantMsg    string
	}{
		{
			name:       "BadRequest with custom error",
			errFunc:    response.ErrBadRequest,
			inputErr:   errors.New("bad input"),
			wantStatus: http.StatusBadRequest,
			wantCode:   "INVALID_REQUEST",
			wantMsg:    "bad input",
		},
		{
			name:       "NotFound default msg",
			errFunc:    response.ErrNotFound,
			inputErr:   nil,
			wantStatus: http.StatusNotFound,
			wantCode:   "NOT_FOUND",
			wantMsg:    "resource not found",
		},
		{
			name:       "Conflict with custom error",
			errFunc:    response.ErrStatusConflict,
			inputErr:   errors.New("user exists"),
			wantStatus: http.StatusConflict,
			wantCode:   "STATUS_CONFLICT",
			wantMsg:    "user exists",
		},
		{
			name:       "Unauthorised default msg",
			errFunc:    response.ErrUnauthorised,
			inputErr:   nil,
			wantStatus: http.StatusUnauthorized,
			wantCode:   "UNAUTHORISED",
			wantMsg:    "unauthorised",
		},
		{
			name:       "InternalServerError default msg",
			errFunc:    response.ErrInternalServerError,
			inputErr:   nil,
			wantStatus: http.StatusInternalServerError,
			wantCode:   "INTERNAL_ERROR",
			wantMsg:    "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appErr := tt.errFunc(tt.inputErr)
			if appErr.Status != tt.wantStatus {
				t.Errorf("got status %d, want %d", appErr.Status, tt.wantStatus)
			}
			if appErr.Code != tt.wantCode {
				t.Errorf("got code %s, want %s", appErr.Code, tt.wantCode)
			}
			if appErr.Message != tt.wantMsg {
				t.Errorf("got message %s, want %s", appErr.Message, tt.wantMsg)
			}
			if appErr.Error() != tt.wantMsg {
				t.Errorf("got Error() %s, want %s", appErr.Error(), tt.wantMsg)
			}
		})
	}
}

func TestErrorHandlerMiddleware(t *testing.T) {
	r := gin.New()
	r.Use(response.ErrorHandler())

	r.GET("/test-app-err", func(c *gin.Context) {
		_ = c.Error(response.ErrBadRequest(errors.New("malformed body")))
	})

	r.GET("/test-generic-err", func(c *gin.Context) {
		_ = c.Error(errors.New("database disconnected"))
	})

	t.Run("handles AppError", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/test-app-err", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}

		var res response.Response
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to parse json response: %v", err)
		}

		if res.Error == nil || res.Error.Code != "INVALID_REQUEST" || res.Error.Message != "malformed body" {
			t.Fatalf("unexpected error response: %+v", res.Error)
		}
	})

	t.Run("handles generic error as internal server error", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/test-generic-err", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}

		var res response.Response
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to parse json response: %v", err)
		}

		if res.Error == nil || res.Error.Code != "INTERNAL_ERROR" {
			t.Fatalf("unexpected error response: %+v", res.Error)
		}
	})
}
