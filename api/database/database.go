package database

import (
	"apiserver/database/repo"
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var DBStore *repo.Queries
var DBPool *pgxpool.Pool

func ConnectDatabase() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatal("Failed to parse database URL:", err)
	}
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	ctx := context.Background()
	DBPool, err = pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatal("Failed to create connection pool:", err)
	}

	if err := DBPool.Ping(ctx); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	DBStore = repo.New(DBPool)

	log.Println("Database connection established with optimized settings")
}

func CloseDatabase() {
	if DBPool != nil {
		DBPool.Close()
		log.Println("Database connection closed")
	}
}
