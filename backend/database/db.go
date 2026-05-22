package db

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" { log.Fatal("Database_Url not found") }

	var err error
	Pool, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {log.Fatal(err)}

	if err = Pool.Ping(context.Background()); err != nil { log.Fatal(err) }

	log.Println("Connected to postgreSQL")
}