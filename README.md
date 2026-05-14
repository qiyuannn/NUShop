postgresql:
  docker compose up -d postgres
  docker compose run --rm migrate (sql migration) // only need to run when db schema changes

  to open psql terminal:
    bash: docker exec -it postgres psql -U user -d orbital

go:
  go run .
