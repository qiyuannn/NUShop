package main

import (
	"backend/database"
	"backend/handlers"
	"backend/response"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load(); if err != nil { log.Fatal(err) }
	if len(os.Getenv("secret")) < 64 {
		log.Fatal("missing/invalid secret")
	}

	db.Connect()
	router := gin.Default()
	
	//CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:8080", "http://localhost:5173"},
		AllowMethods: []string{"GET", "PUT", "POST", "DELETE"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorisation"},
	}))
	
	router.Use(response.ErrorHandler())
	private := router.Group("/")
	//Account Handlers
	router.POST("/login", handlers.Login)
	router.POST("/create_user", handlers.CreateUser)

	//categories handlers
	router.GET("/categories", handlers.GetCategories)

	//listing handlers
	router.GET("/listings", handlers.GetListings)
	private.POST("/listings", handlers.CreateListing)
	private.PUT("/listings/:id", handlers.UpdateListing)
	private.DELETE("/listings/:id", handlers.DeleteListing)

	port := os.Getenv("PORT") 
	if port == "" {
		port = ":8080"
		log.Println("Port undefined, using :8080")
	}
	router.Run(port)
}