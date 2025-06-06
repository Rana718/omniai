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
		log.Fatal("Usage: go run cmd/migrate.go [up|down|status]")
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

	default:
		log.Fatal("Invalid command. Use: up, down, or status")
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
