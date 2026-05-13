package main

import (
	"backend/database"
	"backend/handlers"
	"backend/response"
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	db.Connect()
	router := gin.Default()
	router.Use(response.ErrorHandler())
	router.GET("/categories", handlers.GetCategories)


	port := os.Getenv("PORT") 
	if port == "" {
		port = ":8080"
		log.Println("Port undefined, using :8080")
	}
	router.Run(port)
}