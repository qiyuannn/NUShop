package integrationTest

import (
	"context"
	"os"
	"path/filepath"
	"time"

	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/golang-migrate/migrate/v4"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func setupTestDB() (*pgxpool.Pool , *postgres.PostgresContainer, error) {

	ctx := context.Background()
	pg, err := postgres.Run(ctx,
		"postgres:16",
		postgres.WithDatabase("test-db"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(10*time.Second),
		),
	)
	if err != nil {
		return nil, nil, err
	}
	connStr, err := pg.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		_ = pg.Terminate(ctx)
		return nil, nil, err
	}
	if err := runMigrations(connStr); err != nil {
		_ = pg.Terminate(ctx)
		return nil, nil, err
	}
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
			_ = pg.Terminate(ctx)
			return nil, nil, err
	}

	if err := pool.Ping(ctx); err != nil {
			pool.Close()
			_ = pg.Terminate(ctx)
			return nil, nil, err
	}
	return pool, pg, nil
}

func runMigrations(connStr string) error {

	wd, err := os.Getwd()
	if err != nil {
		return err
	}
	migrationsPath := filepath.Join(wd, "..", "..", "..", "migrations")

	sourceURL := "file://" + filepath.ToSlash(migrationsPath)
	m, err := migrate.New(sourceURL, connStr)
	if err != nil {
		return err
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}
	return nil

}
