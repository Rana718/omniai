package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var migrations = []Migration{
	{
		Version: 1,
		Name:    "create_users_table",
		Up: `
			CREATE TABLE IF NOT EXISTS users (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				email TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL,
				hashed_password TEXT NOT NULL,
				image TEXT,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			
			CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);
			CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
		`,
		Down: `
			DROP INDEX IF EXISTS idx_users_id;
			DROP INDEX IF EXISTS idx_users_email_unique;
			DROP TABLE IF EXISTS users;
		`,
	},
	{
		Version: 2,
		Name:    "create_chats_table",
		Up: `
			CREATE TABLE IF NOT EXISTS chats (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				doc_id TEXT NOT NULL,
				doc_text TEXT NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			
			CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
			CREATE INDEX IF NOT EXISTS idx_chats_doc_id ON chats(doc_id);
		`,
		Down: `
			DROP INDEX IF EXISTS idx_chats_doc_id;
			DROP INDEX IF EXISTS idx_chats_user_id;
			DROP TABLE IF EXISTS chats;
		`,
	},
	{
		Version: 3,
		Name:    "create_qa_histories_table",
		Up: `
			CREATE TABLE IF NOT EXISTS qa_histories (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
				question TEXT NOT NULL,
				answer TEXT NOT NULL,
				timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			
			CREATE INDEX IF NOT EXISTS idx_qa_histories_chat_id ON qa_histories(chat_id);
			CREATE INDEX IF NOT EXISTS idx_qa_histories_timestamp ON qa_histories(timestamp DESC);
		`,
		Down: `
			DROP INDEX IF EXISTS idx_qa_histories_timestamp;
			DROP INDEX IF EXISTS idx_qa_histories_chat_id;
			DROP TABLE IF EXISTS qa_histories;
		`,
	},
	{
		Version: 4,
		Name:    "create_schema_migrations_table",
		Up: `
			CREATE TABLE IF NOT EXISTS schema_migrations (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
		`,
		Down: `
			DROP TABLE IF EXISTS schema_migrations;
		`,
	},
}

type Migration struct {
	Version int
	Name    string
	Up      string
	Down    string
}

type Migrator struct {
	db *pgxpool.Pool
}

func NewMigrator(db *pgxpool.Pool) *Migrator {
	return &Migrator{db: db}
}

func (m *Migrator) createMigrationsTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);
	`
	_, err := m.db.Exec(ctx, query)
	return err
}

func (m *Migrator) getCurrentVersion(ctx context.Context) (int, error) {
	var version int
	query := `SELECT COALESCE(MAX(version), 0) FROM schema_migrations`
	err := m.db.QueryRow(ctx, query).Scan(&version)
	if err != nil {
		return 0, err
	}
	return version, nil
}

func (m *Migrator) recordMigration(ctx context.Context, migration Migration) error {
	query := `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`
	_, err := m.db.Exec(ctx, query, migration.Version, migration.Name)
	return err
}

func (m *Migrator) removeMigrationRecord(ctx context.Context, version int) error {
	query := `DELETE FROM schema_migrations WHERE version = $1`
	_, err := m.db.Exec(ctx, query, version)
	return err
}

func (m *Migrator) Up(ctx context.Context) error {
	if err := m.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	currentVersion, err := m.getCurrentVersion(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current version: %w", err)
	}

	log.Printf("Current database version: %d", currentVersion)

	for _, migration := range migrations {
		if migration.Version <= currentVersion {
			continue
		}

		log.Printf("Applying migration %d: %s", migration.Version, migration.Name)

		// Start transaction
		tx, err := m.db.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to start transaction for migration %d: %w", migration.Version, err)
		}

		// Execute migration
		if _, err := tx.Exec(ctx, migration.Up); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to execute migration %d: %w", migration.Version, err)
		}

		// Record migration
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`, migration.Version, migration.Name); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to record migration %d: %w", migration.Version, err)
		}

		// Commit transaction
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit migration %d: %w", migration.Version, err)
		}

		log.Printf("Successfully applied migration %d: %s", migration.Version, migration.Name)
	}

	log.Println("All migrations applied successfully")
	return nil
}

func (m *Migrator) Down(ctx context.Context, steps int) error {
	currentVersion, err := m.getCurrentVersion(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current version: %w", err)
	}

	if currentVersion == 0 {
		log.Println("No migrations to rollback")
		return nil
	}

	log.Printf("Current database version: %d", currentVersion)

	// Find migrations to rollback
	var migrationsToRollback []Migration
	for i := len(migrations) - 1; i >= 0; i-- {
		migration := migrations[i]
		if migration.Version <= currentVersion && len(migrationsToRollback) < steps {
			migrationsToRollback = append(migrationsToRollback, migration)
		}
	}

	for _, migration := range migrationsToRollback {
		log.Printf("Rolling back migration %d: %s", migration.Version, migration.Name)

		// Start transaction
		tx, err := m.db.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to start transaction for rollback %d: %w", migration.Version, err)
		}

		// Execute rollback
		if _, err := tx.Exec(ctx, migration.Down); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to execute rollback %d: %w", migration.Version, err)
		}

		// Remove migration record
		if _, err := tx.Exec(ctx, `DELETE FROM schema_migrations WHERE version = $1`, migration.Version); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to remove migration record %d: %w", migration.Version, err)
		}

		// Commit transaction
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit rollback %d: %w", migration.Version, err)
		}

		log.Printf("Successfully rolled back migration %d: %s", migration.Version, migration.Name)
	}

	log.Printf("Successfully rolled back %d migrations", len(migrationsToRollback))
	return nil
}

func (m *Migrator) Status(ctx context.Context) error {
	if err := m.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	currentVersion, err := m.getCurrentVersion(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current version: %w", err)
	}

	fmt.Printf("Current database version: %d\n\n", currentVersion)
	fmt.Println("Migration Status:")
	fmt.Println("================")

	for _, migration := range migrations {
		status := "PENDING"
		if migration.Version <= currentVersion {
			status = "APPLIED"
		}
		fmt.Printf("Version %d: %s [%s]\n", migration.Version, migration.Name, status)
	}

	return nil
}

func (m *Migrator) Reset(ctx context.Context) error {
	log.Println("WARNING: This will drop all tables and data!")
	fmt.Print("Are you sure you want to continue? (yes/no): ")

	var response string
	fmt.Scanln(&response)

	if response != "yes" {
		log.Println("Reset cancelled")
		return nil
	}

	// Drop all tables in reverse order
	for i := len(migrations) - 1; i >= 0; i-- {
		migration := migrations[i]
		log.Printf("Dropping migration %d: %s", migration.Version, migration.Name)

		if _, err := m.db.Exec(ctx, migration.Down); err != nil {
			log.Printf("Warning: Failed to drop migration %d: %v", migration.Version, err)
		}
	}

	// Drop migrations table
	if _, err := m.db.Exec(ctx, "DROP TABLE IF EXISTS schema_migrations"); err != nil {
		log.Printf("Warning: Failed to drop schema_migrations table: %v", err)
	}

	log.Println("Database reset completed")
	return nil
}

func main() {
	// Load environment variables - correct the path
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Command line flags
	var (
		command = flag.String("command", "up", "Migration command: up, down, status, reset")
		steps   = flag.Int("steps", 1, "Number of steps for down migration")
	)
	flag.Parse()

	// Get database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	// Create database connection
	ctx := context.Background()
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatal("Failed to parse database URL:", err)
	}

	// Set connection pool parameters
	config.MaxConns = 10
	config.MinConns = 1
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatal("Failed to create connection pool:", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(ctx); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Create migrator
	migrator := NewMigrator(db)

	// Execute command
	switch *command {
	case "up":
		if err := migrator.Up(ctx); err != nil {
			log.Fatal("Migration failed:", err)
		}
	case "down":
		if err := migrator.Down(ctx, *steps); err != nil {
			log.Fatal("Rollback failed:", err)
		}
	case "status":
		if err := migrator.Status(ctx); err != nil {
			log.Fatal("Status check failed:", err)
		}
	case "reset":
		if err := migrator.Reset(ctx); err != nil {
			log.Fatal("Reset failed:", err)
		}
	default:
		log.Fatal("Unknown command. Available commands: up, down, status, reset")
	}
}
