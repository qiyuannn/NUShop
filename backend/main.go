package main

import (
	"backend/auth"
	"backend/database"
	"backend/handlers/categories"
	"backend/handlers/listings"
	"backend/handlers/users"
	"backend/response"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	db.Connect()
	router := gin.Default()

	//CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "https://nushop-frontend.onrender.com"},
		AllowMethods:     []string{"GET", "PUT", "POST", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
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

	//users handlers
	router.GET("/user/:userID", users.GetUser)

	//categories handlers
	router.GET("/categories", categories.GetCategories)
	router.GET("/categories/:categoryID", categories.GetCategory)

	//listing handlers
	router.GET("/listings", listings.GetListings)
	router.GET("/listings/:listingID", listings.GetListing)
	private.GET("/listings/me", listings.GetListings)
	private.POST("/listings", listings.CreateListing)
	private.PUT("/listings/:id", listings.UpdateListing)
	private.DELETE("/listings/:id", listings.DeleteListing)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Println("Port undefined, using :8080")
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatal(err)
	}
	
	router.Static("/uploads", uploadDir)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
