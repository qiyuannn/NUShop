# PostgreSQL
## start Postgres
```bash
docker compose up -d postgres
```
## sql migration
```bash
docker compose run --rm migrate
```
Only need to run when database schema changes 

---
## open psql terminal 
```bash
docker exec -it postgres psql -U user -d orbital
```
psql commands
---
### describe table structure
```sql
\d table_name
```
### quit
```sql
\q
```

# Go
## start go
```bash
go run .
```

