package main

import (
	"log"
	"os"

	"apiserver/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Connect to database
	database.ConnectDatabase()

	// Parse command line arguments
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run cmd/main.go [up|down|status|clean]")
	}

	command := os.Args[1]

	switch command {
	case "up":
		if err := database.RunMigrations(); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		log.Println("Migrations completed successfully")

	case "down":
		if err := database.RollbackLastMigration(); err != nil {
			log.Fatalf("Failed to rollback migration: %v", err)
		}
		log.Println("Rollback completed successfully")

	case "status":
		showMigrationStatus()

	case "clean":
		if err := cleanDatabase(); err != nil {
			log.Fatalf("Failed to clean database: %v", err)
		}
		log.Println("Database cleaned successfully")
		log.Println("Now run: goose -dir db/schema postgres $DATABASE_URL up")

	default:
		log.Fatal("Invalid command. Use: up, down, status, or clean")
	}
}

func showMigrationStatus() {
	var records []database.MigrationRecord
	if err := database.DB.Find(&records).Error; err != nil {
		log.Printf("Error fetching migration records: %v", err)
		return
	}

	log.Println("Applied migrations:")
	for _, record := range records {
		log.Printf("- %s (applied at: %s)", record.Name, record.AppliedAt.Format("2006-01-02 15:04:05"))
	}
}

func cleanDatabase() error {
	log.Println("Cleaning database for SQLC migration...")

	// List of tables to drop (in reverse dependency order)
	tables := []string{
		"qa_histories",
		"chats",
		"users",
		"migration_records", // GORM migration tracking table
	}

	for _, table := range tables {
		log.Printf("Dropping table: %s", table)
		if err := database.DB.Exec("DROP TABLE IF EXISTS " + table + " CASCADE").Error; err != nil {
			log.Printf("Warning: Could not drop table %s: %v", table, err)
		}
	}

	// Drop any remaining constraints or indexes
	log.Println("Cleaning up constraints...")
	cleanupQueries := []string{
		"DROP INDEX IF EXISTS idx_users_email_unique",
		"DROP INDEX IF EXISTS idx_users_id",
		"DROP INDEX IF EXISTS idx_chats_user_id",
		"DROP INDEX IF EXISTS idx_qa_histories_chat_id",
		"DROP INDEX IF EXISTS idx_qa_histories_timestamp",
	}

	for _, query := range cleanupQueries {
		database.DB.Exec(query)
	}

	log.Println("Database cleaned successfully")
	return nil
}
