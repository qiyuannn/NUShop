package response

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Data  any        `json:"data,omitempty"`
	Error *ErrorInfo `json:"error,omitempty"`
}

type ErrorInfo struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Cursor struct {
	CursorTime time.Time `json:"cursor_time,omitempty"`
	CursorID   string    `json:"cursor_id,omitempty"`
	HasMore    bool      `json:"has_more"`
}

type AppError struct {
	Err     error
	Status  int
	Code    string
	Message string
}

func (e *AppError) Error() string {
	return e.Message
}

func Success(c *gin.Context, status int, data any) {
	c.JSON(status, Response{
		Data: data,
	})
}

// Structured Errors
func ErrInternalServerError(err error) *AppError {
	msg := "internal server error"
	if err != nil && err.Error() != "" {
		msg = err.Error()
	}
	return &AppError{Err: err, Status: http.StatusInternalServerError, Code: "INTERNAL_ERROR", Message: msg}
}

func ErrNotFound(err error) *AppError {
	msg := "resource not found"
	if err != nil && err.Error() != "" {
		msg = err.Error()
	}
	return &AppError{Err: err, Status: http.StatusNotFound, Code: "NOT_FOUND", Message: msg}
}

func ErrBadRequest(err error) *AppError {
	msg := "invalid request"
	if err != nil && err.Error() != "" {
		msg = err.Error()
	}
	return &AppError{Err: err, Status: http.StatusBadRequest, Code: "INVALID_REQUEST", Message: msg}
}

func ErrStatusConflict(err error) *AppError {
	msg := "conflict"
	if err != nil && err.Error() != "" {
		msg = err.Error()
	}
	return &AppError{Err: err, Status: http.StatusConflict, Code: "STATUS_CONFLICT", Message: msg}
}

func ErrUnauthorised(err error) *AppError {
	msg := "unauthorised"
	if err != nil && err.Error() != "" {
		msg = err.Error()
	}
	return &AppError{Err: err, Status: http.StatusUnauthorized, Code: "UNAUTHORISED", Message: msg}
}

// Error middleware
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 || c.Writer.Written() {
			return
		}

		err := c.Errors.Last().Err
		var ae *AppError
		if errors.As(err, &ae) {
			log.Printf("[error] Method=%s Path=%s Error=%v",
				c.Request.Method,
				c.Request.RequestURI,
				ae.Err,
			)
		} else {
			log.Printf("[error] Method=%s Path=%s Error=%v",
				c.Request.Method,
				c.Request.RequestURI,
				err,
			)
		}

		var appErr *AppError

		if errors.As(err, &appErr) {
			c.JSON(appErr.Status, Response{
				Error: &ErrorInfo{
					Code:    appErr.Code,
					Message: appErr.Message,
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, Response{
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "something went wrong",
			},
		})
	}
}
