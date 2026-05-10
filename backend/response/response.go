package response

import (
	"log"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Data any `json:"data,omitempty"`
	Error *ErrorInfo `json:"error,omitempty"`
	Meta *Meta `json:"meta,omitempty"`
}

type ErrorInfo struct {
	Code string `json:"code"`
	Message string `json:"message"`
}

type Meta struct {
	Page int64 `json:"page,omitempty"`
	PerPage int64 `json:"per_page,omitempty"`
	Total int64 `json:"total,omitempty"`
	TotalPages int64 `json:"total_pages,omitempty"`
}

func Error(c *gin.Context, err error, status int, code string, message string) {
	c.JSON(status, Response{
		Error: &ErrorInfo{
			Code: code,
			Message: message,
		},
	})
	log.Printf("%s: %v", message, err)
}

func Success(c *gin.Context, status int, data any) {
	c.JSON(status, Response{
		Data: data,
	})
}