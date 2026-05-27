package main

import (
	"backend/auth"
	"backend/database"
	"backend/handlers/categories"
	"backend/handlers/listings"
	"backend/response"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal(err)
	}
	if len(os.Getenv("AcessTokenSecret")) < 64 || len(os.Getenv("RefreshTokenSecret")) < 64 {
		log.Fatal("missing/invalid secret")
	}

	db.Connect()
	router := gin.Default()

	//CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8080", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "PUT", "POST", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorisation"},
		AllowCredentials: true,
	}))

	router.Use(response.ErrorHandler())
	private := router.Group("/")
	private.Use(auth.AuthHandler())

	//Auth
	router.POST("/auth/refresh", auth.RefreshToken)
	router.PUT("/auth/logout", auth.Logout)
	router.POST("/login", auth.Login)
	router.POST("/create_user", auth.CreateUser)

	//categories handlers
	router.GET("/categories", categories.GetCategories)

	//listing handlers
	router.GET("/listings/:listingID", listings.GetListing)
	private.POST("/listings", listings.CreateListing)
	private.PUT("/listings/:id", listings.UpdateListing)
	private.DELETE("/listings/:id", listings.DeleteListing)

	port := os.Getenv("PORT")
	if port == "" {
		port = ":8080"
		log.Println("Port undefined, using :8080")
	}
	router.Static("/uploads", "./uploads")
	router.Run(port)
}
