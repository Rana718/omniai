package database

import (
	"fmt"
	"log"
	"time"

	"apiserver/models"
)

// Migration represents a database migration
type Migration struct {
	Name      string
	Timestamp time.Time
	Up        func() error
	Down      func() error
}

// Migrations is a list of all migrations
var Migrations = []Migration{
	{
		Name:      "create_users_table",
		Timestamp: time.Date(2025, 6, 5, 0, 0, 0, 0, time.UTC),
		Up: func() error {
			log.Println("Running migration: create_users_table")
			return DB.AutoMigrate(&models.User{})
		},
		Down: func() error {
			log.Println("Rolling back migration: create_users_table")
			return DB.Migrator().DropTable("users")
		},
	},
	{
		Name:      "create_chats_table",
		Timestamp: time.Date(2025, 6, 5, 0, 1, 0, 0, time.UTC),
		Up: func() error {
			log.Println("Running migration: create_chats_table")
			return DB.AutoMigrate(&models.Chat{})
		},
		Down: func() error {
			log.Println("Rolling back migration: create_chats_table")
			return DB.Migrator().DropTable("chats")
		},
	},
	{
		Name:      "create_qa_histories_table",
		Timestamp: time.Date(2025, 6, 5, 0, 2, 0, 0, time.UTC),
		Up: func() error {
			log.Println("Running migration: create_qa_histories_table")
			return DB.AutoMigrate(&models.QAHistory{})
		},
		Down: func() error {
			log.Println("Rolling back migration: create_qa_histories_table")
			return DB.Migrator().DropTable("qa_histories")
		},
	},
	{
		Name:      "add_foreign_key_constraints",
		Timestamp: time.Date(2025, 6, 5, 0, 3, 0, 0, time.UTC),
		Up: func() error {
			log.Println("Running migration: add_foreign_key_constraints")

			// Add foreign key constraint for chats.user_id -> users.id
			if err := DB.Exec(`
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'fk_chats_user_id'
                    ) THEN
                        ALTER TABLE chats ADD CONSTRAINT fk_chats_user_id 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                    END IF;
                END $$;
            `).Error; err != nil {
				return fmt.Errorf("failed to add chats foreign key: %w", err)
			}

			// Add foreign key constraint for qa_histories.chat_id -> chats.id
			if err := DB.Exec(`
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'fk_qa_histories_chat_id'
                    ) THEN
                        ALTER TABLE qa_histories ADD CONSTRAINT fk_qa_histories_chat_id 
                        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;
                    END IF;
                END $$;
            `).Error; err != nil {
				return fmt.Errorf("failed to add qa_histories foreign key: %w", err)
			}

			return nil
		},
		Down: func() error {
			log.Println("Rolling back migration: add_foreign_key_constraints")

			// Drop foreign key constraints
			if err := DB.Exec("ALTER TABLE qa_histories DROP CONSTRAINT IF EXISTS fk_qa_histories_chat_id").Error; err != nil {
				return fmt.Errorf("failed to drop qa_histories foreign key: %w", err)
			}

			if err := DB.Exec("ALTER TABLE chats DROP CONSTRAINT IF EXISTS fk_chats_user_id").Error; err != nil {
				return fmt.Errorf("failed to drop chats foreign key: %w", err)
			}

			return nil
		},
	},
	// Update the add_indexes migration
	{
		Name:      "add_indexes",
		Timestamp: time.Date(2025, 6, 5, 0, 4, 0, 0, time.UTC),
		Up: func() error {
			log.Println("Running migration: add_indexes")

			// Add UNIQUE index on users.email for faster lookups (most important)
			if err := DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)").Error; err != nil {
				return fmt.Errorf("failed to create users email unique index: %w", err)
			}

			// Add index on users.id (UUID primary key optimization)
			if err := DB.Exec("CREATE INDEX IF NOT EXISTS idx_users_id ON users(id)").Error; err != nil {
				return fmt.Errorf("failed to create users id index: %w", err)
			}

			// Add index on chats.user_id for faster joins
			if err := DB.Exec("CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)").Error; err != nil {
				return fmt.Errorf("failed to create chats user_id index: %w", err)
			}

			// Add index on qa_histories.chat_id for faster joins
			if err := DB.Exec("CREATE INDEX IF NOT EXISTS idx_qa_histories_chat_id ON qa_histories(chat_id)").Error; err != nil {
				return fmt.Errorf("failed to create qa_histories chat_id index: %w", err)
			}

			// Add index on qa_histories.timestamp for sorting
			if err := DB.Exec("CREATE INDEX IF NOT EXISTS idx_qa_histories_timestamp ON qa_histories(timestamp DESC)").Error; err != nil {
				return fmt.Errorf("failed to create qa_histories timestamp index: %w", err)
			}

			return nil
		},
		Down: func() error {
			log.Println("Rolling back migration: add_indexes")

			indexes := []string{
				"idx_users_email_unique",
				"idx_users_id",
				"idx_chats_user_id",
				"idx_qa_histories_chat_id",
				"idx_qa_histories_timestamp",
			}

			for _, index := range indexes {
				if err := DB.Exec(fmt.Sprintf("DROP INDEX IF EXISTS %s", index)).Error; err != nil {
					return fmt.Errorf("failed to drop index %s: %w", index, err)
				}
			}

			return nil
		},
	},
}

// MigrationRecord tracks which migrations have been applied
type MigrationRecord struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"uniqueIndex"`
	AppliedAt time.Time
}

// RunMigrations applies all pending migrations
func RunMigrations() error {
	// Create migrations table if it doesn't exist
	if err := DB.AutoMigrate(&MigrationRecord{}); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get applied migrations
	var appliedMigrations []MigrationRecord
	if err := DB.Find(&appliedMigrations).Error; err != nil {
		return fmt.Errorf("failed to fetch applied migrations: %w", err)
	}

	// Create a map of applied migrations for quick lookup
	applied := make(map[string]bool)
	for _, m := range appliedMigrations {
		applied[m.Name] = true
	}

	// Apply pending migrations in order
	for _, migration := range Migrations {
		if !applied[migration.Name] {
			log.Printf("Applying migration: %s", migration.Name)

			// Start a transaction
			tx := DB.Begin()

			// Run the migration
			if err := migration.Up(); err != nil {
				tx.Rollback()
				return fmt.Errorf("migration '%s' failed: %w", migration.Name, err)
			}

			// Record the migration
			record := MigrationRecord{
				Name:      migration.Name,
				AppliedAt: time.Now(),
			}
			if err := tx.Create(&record).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to record migration '%s': %w", migration.Name, err)
			}

			// Commit the transaction
			if err := tx.Commit().Error; err != nil {
				return fmt.Errorf("failed to commit migration '%s': %w", migration.Name, err)
			}

			log.Printf("Migration applied successfully: %s", migration.Name)
		} else {
			log.Printf("Migration already applied: %s", migration.Name)
		}
	}

	log.Println("All migrations completed successfully")
	return nil
}

// RollbackLastMigration rolls back the last applied migration
func RollbackLastMigration() error {
	var lastMigration MigrationRecord
	if err := DB.Order("applied_at DESC").First(&lastMigration).Error; err != nil {
		return fmt.Errorf("no migrations to roll back: %w", err)
	}

	// Find the migration to roll back
	var migrationToRollback Migration
	found := false
	for _, m := range Migrations {
		if m.Name == lastMigration.Name {
			migrationToRollback = m
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("migration '%s' not found in code", lastMigration.Name)
	}

	// Start a transaction
	tx := DB.Begin()

	// Run the down migration
	log.Printf("Rolling back migration: %s", migrationToRollback.Name)
	if err := migrationToRollback.Down(); err != nil {
		tx.Rollback()
		return fmt.Errorf("rollback of '%s' failed: %w", migrationToRollback.Name, err)
	}

	// Delete the migration record
	if err := tx.Delete(&lastMigration).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete migration record '%s': %w", migrationToRollback.Name, err)
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit rollback of '%s': %w", migrationToRollback.Name, err)
	}

	log.Printf("Migration rolled back successfully: %s", migrationToRollback.Name)
	return nil
}
