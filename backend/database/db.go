package db

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not found")
	}

	if !strings.Contains(dbURL, "sslmode=") {
		if strings.Contains(dbURL, "?") {
			dbURL += "&sslmode=require"
		} else {
			dbURL += "?sslmode=require"
		}
	}

	var err error
	Pool, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}

	if err = Pool.Ping(context.Background()); err != nil {
		log.Fatal(err)
	}

	log.Println("Connected to PostgreSQL")
}