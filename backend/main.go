package main

import (
	"backend/database"
	"backend/response"
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	db.Connect()
	router := gin.Default()
	router.Use(response.ErrorHandler())


	port := os.Getenv("PORT") 
	if port == "" {
		port = ":8080"
		log.Println("Port undefined, using :8080")
	}
	router.Run(port)
}