package main

import (
	"backend/auth"
	chatv2 "backend/chat_V2"
	"backend/database"
	"backend/handlers/cart"
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
		AllowOrigins:     []string{"http://localhost:5173", "https://nushop-frontend.onrender.com", "https://nushop-test.onrender.com", "https://nushop-dusky.vercel.app"},
		AllowMethods:     []string{"GET", "PUT", "POST", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"ok":      true,
			"service": "nushop-backend",
		})
	})

	router.Use(response.ErrorHandler())
	private := router.Group("/")
	private.Use(auth.AuthHandler())

	//Auth
	router.POST("/auth/refresh", auth.RefreshToken)
	router.PUT("/auth/logout", auth.Logout)
	router.POST("/login", auth.Login)
	router.POST("/create_user", auth.CreateUser)
	router.POST("/auth/request_code", auth.RequestEmailCode)
	router.POST("/auth/verify_code", auth.VerifyEmailCode)
	router.POST("/auth/google_login", auth.GoogleLogin)

	//users handlers
	router.GET("/user/:userID", users.GetUser)

	//categories handlers
	router.GET("/categories", categories.GetCategories)

	//listing handlers
	router.GET("/listings/:listingID", listings.GetListing)

	router.GET("/listings", listings.GetListingsV3)
	private.GET("/listings/manage", listings.GetListingsV3)

	private.POST("/listings", listings.CreateListing)
	private.PUT("/listings/:id", listings.UpdateListing)
	private.DELETE("/listings/:id", listings.DeleteListing)

	//cart handlers
	private.GET("/cart", cart.GetCart)
	private.POST("/cart", cart.AddToCart)
	private.DELETE("/cart", cart.DeleteFromCart)

	//chat handlers
	private.GET("/chat", chatv2.GetChats)
	private.GET("/chat/:listingID/:otherID", chatv2.GetChatHistory)
	private.GET("/chat/info/:listingID/:id1/:id2", chatv2.GetChatInfo)
	private.GET("/chat/info/:listingID/:id1", chatv2.GetChatInfo)

	hub := chatv2.NewHub()
	go hub.Run()
	router.GET("/ws", chatv2.ServeWs(hub))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Println("Port undefined, using :8080")
	}

	router.Static("/uploads", "./uploads")
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
