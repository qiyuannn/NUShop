package integrationTest

import (
	db "backend/database"
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

var (
	pool *pgxpool.Pool
	pgContainer *postgres.PostgresContainer
)

func TestMain(m *testing.M) {
	var err error
	pool, pgContainer, err = setupTestDB()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to set up test db: %v\n", err)
		os.Exit(1)
	}

	db.Pool = pool
	code := m.Run()
	pool.Close()
	_ = pgContainer.Terminate(context.Background())
	os.Exit(code)
}