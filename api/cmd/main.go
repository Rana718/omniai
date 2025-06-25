package main

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Migration represents a single database migration
type Migration struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Applied   bool       `json:"applied"`
	AppliedAt *time.Time `json:"applied_at,omitempty"`
	Up        string     `json:"up"`
	Down      string     `json:"down"`
	Checksum  string     `json:"checksum"`
	CreatedAt time.Time  `json:"created_at"`
}

// MigrationFile represents the structure of a migration file
type MigrationFile struct {
	Migration Migration `json:"migration"`
}

// Migrator handles database migrations
type Migrator struct {
	db             *pgxpool.Pool
	migrationsPath string
}

// BackupData represents backup information
type BackupData struct {
	Timestamp string                 `json:"timestamp"`
	Version   string                 `json:"version"`
	Tables    map[string]interface{} `json:"tables"`
	Comment   string                 `json:"comment"`
}

// SchemaParser parses schema files
type SchemaParser struct {
	schemaPath string
}

// MigrationStatus represents migration status information
type MigrationStatus struct {
	TotalMigrations   int                   `json:"total_migrations"`
	AppliedMigrations int                   `json:"applied_migrations"`
	PendingMigrations int                   `json:"pending_migrations"`
	Migrations        []MigrationStatusItem `json:"migrations"`
	DatabaseStatus    string                `json:"database_status"`
}

// MigrationStatusItem represents individual migration status
type MigrationStatusItem struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Status    string     `json:"status"`
	AppliedAt *time.Time `json:"applied_at,omitempty"`
}

// Table represents a database table
type Table struct {
	Name      string
	CreateSQL string
}

// NewSchemaParser creates a new schema parser
func NewSchemaParser(schemaPath string) *SchemaParser {
	return &SchemaParser{schemaPath: schemaPath}
}

// ParseSchema parses the schema file and generates migrations
func (sp *SchemaParser) ParseSchema() ([]Migration, error) {
	content, err := os.ReadFile(sp.schemaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read schema file: %w", err)
	}

	schemaContent := string(content)
	var migrations []Migration

	// Generate unique ID for extensions migration
	extensionsSQL := `-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

	migrations = append(migrations, Migration{
		ID:        sp.generateMigrationID("enable_required_extensions"),
		Name:      "Enable required extensions",
		Up:        extensionsSQL,
		Down:      `DROP EXTENSION IF EXISTS "pgcrypto";`,
		Checksum:  sp.generateChecksum(extensionsSQL),
		CreatedAt: time.Now(),
	})

	// Migration table creation
	migrationTableSQL := `-- Create schema migrations tracking table
CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);`

	migrations = append(migrations, Migration{
		ID:        sp.generateMigrationID("create_prisma_migrations_table"),
		Name:      "Create _prisma_migrations table",
		Up:        migrationTableSQL,
		Down:      `DROP TABLE IF EXISTS _prisma_migrations CASCADE;`,
		Checksum:  sp.generateChecksum(migrationTableSQL),
		CreatedAt: time.Now(),
	})

	// Parse tables from schema
	tables := sp.extractTables(schemaContent)
	for _, table := range tables {
		tableSQL := fmt.Sprintf("-- Create table: %s\n%s", table.Name, table.CreateSQL)
		migration := Migration{
			ID:        sp.generateMigrationID(fmt.Sprintf("create_%s_table", table.Name)),
			Name:      fmt.Sprintf("Create %s table", table.Name),
			Up:        tableSQL,
			Down:      fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE;", table.Name),
			Checksum:  sp.generateChecksum(tableSQL),
			CreatedAt: time.Now(),
		}
		migrations = append(migrations, migration)
	}

	// Parse indexes
	indexes := sp.extractIndexes(schemaContent)
	if len(indexes) > 0 {
		indexSQL := "-- Create indexes\n" + strings.Join(indexes, "\n")
		migration := Migration{
			ID:        sp.generateMigrationID("create_indexes"),
			Name:      "Create database indexes",
			Up:        indexSQL,
			Down:      sp.generateDropIndexes(indexes),
			Checksum:  sp.generateChecksum(indexSQL),
			CreatedAt: time.Now(),
		}
		migrations = append(migrations, migration)
	}

	// Parse functions
	functions := sp.extractFunctions(schemaContent)
	if len(functions) > 0 {
		functionSQL := "-- Create custom functions\n" + strings.Join(functions, "\n")
		migration := Migration{
			ID:        sp.generateMigrationID("create_custom_functions"),
			Name:      "Create custom functions",
			Up:        functionSQL,
			Down:      sp.generateDropFunctions(functions),
			Checksum:  sp.generateChecksum(functionSQL),
			CreatedAt: time.Now(),
		}
		migrations = append(migrations, migration)
	}

	// Parse triggers
	triggers := sp.extractTriggers(schemaContent)
	if len(triggers) > 0 {
		triggerSQL := "-- Create triggers\n" + strings.Join(triggers, "\n")
		migration := Migration{
			ID:        sp.generateMigrationID("create_triggers"),
			Name:      "Create database triggers",
			Up:        triggerSQL,
			Down:      sp.generateDropTriggers(triggers),
			Checksum:  sp.generateChecksum(triggerSQL),
			CreatedAt: time.Now(),
		}
		migrations = append(migrations, migration)
	}

	return migrations, nil
}

// generateMigrationID generates a unique migration ID with timestamp
func (sp *SchemaParser) generateMigrationID(name string) string {
	timestamp := time.Now().Format("20060102150405")
	cleanName := strings.ReplaceAll(strings.ToLower(name), " ", "_")
	return fmt.Sprintf("%s_%s", timestamp, cleanName)
}

// generateChecksum generates a checksum for migration content
func (sp *SchemaParser) generateChecksum(content string) string {
	h := sha256.Sum256([]byte(content))
	return hex.EncodeToString(h[:])
}

// extractTables extracts table definitions from schema
func (sp *SchemaParser) extractTables(schema string) []Table {
	var tables []Table
	tableRegex := regexp.MustCompile(`(?is)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(((?:[^();]+|\([^)]*\))*)\);`)
	matches := tableRegex.FindAllStringSubmatch(schema, -1)

	for _, match := range matches {
		if len(match) >= 3 {
			tableName := match[1]
			tableSQL := strings.TrimSpace(match[0])
			tables = append(tables, Table{
				Name:      tableName,
				CreateSQL: tableSQL,
			})
		}
	}
	return tables
}

// extractIndexes extracts index definitions from schema
func (sp *SchemaParser) extractIndexes(schema string) []string {
	var indexes []string
	indexRegex := regexp.MustCompile(`(?is)CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[^;]+;`)
	matches := indexRegex.FindAllString(schema, -1)

	for _, match := range matches {
		indexes = append(indexes, strings.TrimSpace(match))
	}
	return indexes
}

// extractFunctions extracts function definitions from schema
func (sp *SchemaParser) extractFunctions(schema string) []string {
	var functions []string
	functionRegex := regexp.MustCompile(`(?is)CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[^;]+(?:\$\$[^$]*\$\$|'[^']*')[^;]*;`)
	matches := functionRegex.FindAllString(schema, -1)

	for _, match := range matches {
		functions = append(functions, strings.TrimSpace(match))
	}
	return functions
}

// extractTriggers extracts trigger definitions from schema
func (sp *SchemaParser) extractTriggers(schema string) []string {
	var triggers []string
	triggerRegex := regexp.MustCompile(`(?is)CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+[^;]+;`)
	matches := triggerRegex.FindAllString(schema, -1)

	for _, match := range matches {
		triggers = append(triggers, strings.TrimSpace(match))
	}
	return triggers
}

// generateDropIndexes generates DROP statements for indexes
func (sp *SchemaParser) generateDropIndexes(indexes []string) string {
	var dropStatements []string
	indexNameRegex := regexp.MustCompile(`(?i)CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)`)

	for _, index := range indexes {
		matches := indexNameRegex.FindStringSubmatch(index)
		if len(matches) >= 2 {
			indexName := matches[1]
			dropStatements = append(dropStatements, fmt.Sprintf("DROP INDEX IF EXISTS %s;", indexName))
		}
	}
	return "-- Drop indexes\n" + strings.Join(dropStatements, "\n")
}

// generateDropFunctions generates DROP statements for functions
func (sp *SchemaParser) generateDropFunctions(functions []string) string {
	var dropStatements []string
	functionNameRegex := regexp.MustCompile(`(?i)CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)`)

	for _, function := range functions {
		matches := functionNameRegex.FindStringSubmatch(function)
		if len(matches) >= 2 {
			functionName := matches[1]
			dropStatements = append(dropStatements, fmt.Sprintf("DROP FUNCTION IF EXISTS %s CASCADE;", functionName))
		}
	}
	return "-- Drop functions\n" + strings.Join(dropStatements, "\n")
}

// generateDropTriggers generates DROP statements for triggers
func (sp *SchemaParser) generateDropTriggers(triggers []string) string {
	var dropStatements []string
	triggerRegex := regexp.MustCompile(`(?i)CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)\s+.*?\s+ON\s+(\w+)`)

	for _, trigger := range triggers {
		matches := triggerRegex.FindStringSubmatch(trigger)
		if len(matches) >= 3 {
			triggerName := matches[1]
			tableName := matches[2]
			dropStatements = append(dropStatements, fmt.Sprintf("DROP TRIGGER IF EXISTS %s ON %s;", triggerName, tableName))
		}
	}
	return "-- Drop triggers\n" + strings.Join(dropStatements, "\n")
}

// NewMigrator creates a new migrator instance
func NewMigrator(db *pgxpool.Pool, migrationsPath string) *Migrator {
	return &Migrator{
		db:             db,
		migrationsPath: migrationsPath,
	}
}

// createMigrationsTable creates the Prisma-style migrations table
func (m *Migrator) createMigrationsTable(ctx context.Context) error {
	query := `
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
            id VARCHAR(36) PRIMARY KEY,
            checksum VARCHAR(64) NOT NULL,
            finished_at TIMESTAMP WITH TIME ZONE,
            migration_name VARCHAR(255) NOT NULL,
            logs TEXT,
            rolled_back_at TIMESTAMP WITH TIME ZONE,
            started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            applied_steps_count INTEGER NOT NULL DEFAULT 0
        );
    `
	_, err := m.db.Exec(ctx, query)
	return err
}

// getAppliedMigrations returns list of applied migrations
func (m *Migrator) getAppliedMigrations(ctx context.Context) (map[string]*time.Time, error) {
	applied := make(map[string]*time.Time)

	query := `SELECT id, finished_at FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
	rows, err := m.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var finishedAt *time.Time
		if err := rows.Scan(&id, &finishedAt); err != nil {
			return nil, err
		}
		applied[id] = finishedAt
	}

	return applied, nil
}

// hasConflicts checks for migration conflicts
func (m *Migrator) hasConflicts(ctx context.Context, migrations []Migration) (bool, []string, error) {
	var conflicts []string

	// Check for table conflicts
	for _, migration := range migrations {
		if strings.Contains(strings.ToUpper(migration.Up), "CREATE TABLE") {
			tableRegex := regexp.MustCompile(`(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)`)
			matches := tableRegex.FindStringSubmatch(migration.Up)
			if len(matches) >= 2 {
				tableName := matches[1]

				var exists bool
				err := m.db.QueryRow(ctx,
					"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public')",
					tableName).Scan(&exists)
				if err != nil {
					return false, nil, err
				}

				if exists && tableName != "_prisma_migrations" {
					conflicts = append(conflicts, fmt.Sprintf("Table '%s' already exists", tableName))
				}
			}
		}
	}

	return len(conflicts) > 0, conflicts, nil
}

// askUserConfirmation prompts user for confirmation
func (m *Migrator) askUserConfirmation(message string) bool {
	fmt.Printf("🤔 %s (y/N): ", message)
	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(strings.ToLower(response))
	return response == "yes" || response == "y"
}

// createBackup creates a backup of the database
func (m *Migrator) createBackup(ctx context.Context, comment string) (string, error) {
	log.Println("📦 Creating database backup...")

	backupDir := "database/backups"
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create backup directory: %w", err)
	}

	applied, err := m.getAppliedMigrations(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get applied migrations: %w", err)
	}

	backup := BackupData{
		Timestamp: time.Now().Format("2006-01-02_15-04-05"),
		Version:   fmt.Sprintf("%d_migrations", len(applied)),
		Tables:    make(map[string]interface{}),
		Comment:   comment,
	}

	tables, err := m.getAllTableNames(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get table names: %w", err)
	}

	for _, table := range tables {
		rows, err := m.db.Query(ctx, fmt.Sprintf("SELECT * FROM %s", table))
		if err != nil {
			log.Printf("⚠️  Warning: Failed to backup table %s: %v", table, err)
			continue
		}

		fieldDescriptions := rows.FieldDescriptions()
		columns := make([]string, len(fieldDescriptions))
		for i, fd := range fieldDescriptions {
			columns[i] = string(fd.Name)
		}

		var tableData []map[string]interface{}

		for rows.Next() {
			values, err := rows.Values()
			if err != nil {
				log.Printf("⚠️  Warning: Failed to read row from %s: %v", table, err)
				continue
			}

			rowData := make(map[string]interface{})
			for i, column := range columns {
				rowData[column] = values[i]
			}
			tableData = append(tableData, rowData)
		}
		rows.Close()

		backup.Tables[table] = map[string]interface{}{
			"columns": columns,
			"data":    tableData,
		}

		log.Printf("✅ Backed up table %s with %d rows", table, len(tableData))
	}

	filename := fmt.Sprintf("backup_%s.json", backup.Timestamp)
	backupPath := filepath.Join(backupDir, filename)

	file, err := os.Create(backupPath)
	if err != nil {
		return "", fmt.Errorf("failed to create backup file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(backup); err != nil {
		return "", fmt.Errorf("failed to write backup data: %w", err)
	}

	log.Printf("✅ Database backup created: %s", backupPath)
	return backupPath, nil
}

// getAllTableNames returns all table names in the database
func (m *Migrator) getAllTableNames(ctx context.Context) ([]string, error) {
	query := `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `

	rows, err := m.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}

	return tables, nil
}

// generateMigration creates a new migration file
func (m *Migrator) generateMigration(name string) error {
	if err := os.MkdirAll(m.migrationsPath, 0755); err != nil {
		return fmt.Errorf("failed to create migrations directory: %w", err)
	}

	timestamp := time.Now().Format("20060102150405")
	cleanName := strings.ReplaceAll(strings.ToLower(name), " ", "_")
	migrationID := fmt.Sprintf("%s_%s", timestamp, cleanName)

	upSQL := fmt.Sprintf(`-- CreateTable or AlterTable: %s
-- Add your SQL commands here

-- Example:
-- CREATE TABLE example (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
-- );`, name)

	downSQL := `-- Drop or alter statements to reverse the migration
-- Add your reverse SQL commands here

-- Example:
-- DROP TABLE IF EXISTS example CASCADE;`

	migration := Migration{
		ID:        migrationID,
		Name:      name,
		Up:        upSQL,
		Down:      downSQL,
		Checksum:  generateChecksum(upSQL),
		CreatedAt: time.Now(),
	}

	migrationFile := MigrationFile{Migration: migration}

	filename := fmt.Sprintf("%s.json", migrationID)
	filePath := filepath.Join(m.migrationsPath, filename)

	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create migration file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(migrationFile); err != nil {
		return fmt.Errorf("failed to write migration file: %w", err)
	}

	log.Printf("✨ Generated migration: %s", filePath)
	return nil
}

// loadMigrationsFromDir loads migrations from directory
func (m *Migrator) loadMigrationsFromDir() ([]Migration, error) {
	var migrations []Migration

	if _, err := os.Stat(m.migrationsPath); os.IsNotExist(err) {
		return migrations, nil
	}

	files, err := os.ReadDir(m.migrationsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read migrations directory: %w", err)
	}

	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		filePath := filepath.Join(m.migrationsPath, file.Name())
		data, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("⚠️  Warning: Failed to read migration file %s: %v", file.Name(), err)
			continue
		}

		var migrationFile MigrationFile
		if err := json.Unmarshal(data, &migrationFile); err != nil {
			log.Printf("⚠️  Warning: Failed to parse migration file %s: %v", file.Name(), err)
			continue
		}

		migrations = append(migrations, migrationFile.Migration)
	}

	// Sort migrations by creation time
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].CreatedAt.Before(migrations[j].CreatedAt)
	})

	return migrations, nil
}

// Dev applies pending migrations for development
func (m *Migrator) Dev(ctx context.Context, name string) error {
	log.Println("🚀 Running prisma migrate dev...")

	if err := m.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Check for conflicts first
	migrations, err := m.loadMigrationsFromDir()
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	hasConflicts, conflicts, err := m.hasConflicts(ctx, migrations)
	if err != nil {
		return fmt.Errorf("failed to check for conflicts: %w", err)
	}

	if hasConflicts {
		log.Println("⚠️  WARNING: Potential conflicts detected:")
		for _, conflict := range conflicts {
			log.Printf("  • %s", conflict)
		}

		if m.askUserConfirmation("Do you want to backup all tables before proceeding?") {
			backupPath, err := m.createBackup(ctx, "Pre-migration backup due to conflicts")
			if err != nil {
				return fmt.Errorf("failed to create backup: %w", err)
			}
			log.Printf("✅ Backup created at: %s", backupPath)

			if m.askUserConfirmation("Reset database and clear all migrations?") {
				if err := m.Reset(ctx); err != nil {
					return fmt.Errorf("failed to reset database: %w", err)
				}
			}
		}

		if !m.askUserConfirmation("Continue with migration despite conflicts?") {
			log.Println("❌ Migration cancelled by user")
			return nil
		}
	}

	// Generate new migration if name provided
	if name != "" {
		if err := m.generateMigration(name); err != nil {
			return fmt.Errorf("failed to generate migration: %w", err)
		}

		// Reload migrations after generating new one
		migrations, err = m.loadMigrationsFromDir()
		if err != nil {
			return fmt.Errorf("failed to reload migrations: %w", err)
		}
	}

	// Apply all pending migrations
	return m.Deploy(ctx)
}

// Deploy applies all pending migrations
func (m *Migrator) Deploy(ctx context.Context) error {
	log.Println("🚀 Running prisma migrate deploy...")

	if err := m.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	migrations, err := m.loadMigrationsFromDir()
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	applied, err := m.getAppliedMigrations(ctx)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	var pendingMigrations []Migration
	for _, migration := range migrations {
		if _, exists := applied[migration.ID]; !exists {
			pendingMigrations = append(pendingMigrations, migration)
		}
	}

	if len(pendingMigrations) == 0 {
		log.Println("✅ No pending migrations")
		return nil
	}

	log.Printf("📋 Found %d pending migrations", len(pendingMigrations))

	for _, migration := range pendingMigrations {
		log.Printf("⏳ Applying migration: %s", migration.Name)

		// Start migration record
		if _, err := m.db.Exec(ctx, `
			INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at) 
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (id) DO NOTHING
		`, migration.ID, migration.Checksum, migration.Name); err != nil {
			return fmt.Errorf("failed to start migration record %s: %w", migration.ID, err)
		}

		// Execute migration in transaction
		tx, err := m.db.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to start transaction for migration %s: %w", migration.ID, err)
		}

		if _, err := tx.Exec(ctx, migration.Up); err != nil {
			tx.Rollback(ctx)

			// Log failure
			m.db.Exec(ctx, `
				UPDATE _prisma_migrations 
				SET logs = $1, finished_at = NOW() 
				WHERE id = $2
			`, fmt.Sprintf("Migration failed: %v", err), migration.ID)

			return fmt.Errorf("failed to execute migration %s: %w", migration.ID, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", migration.ID, err)
		}

		// Mark as completed
		if _, err := m.db.Exec(ctx, `
			UPDATE _prisma_migrations 
			SET finished_at = NOW(), applied_steps_count = 1, logs = 'Migration completed successfully'
			WHERE id = $1
		`, migration.ID); err != nil {
			return fmt.Errorf("failed to mark migration as complete %s: %w", migration.ID, err)
		}

		log.Printf("✅ Applied migration: %s", migration.Name)
	}

	log.Println("🎉 All migrations applied successfully")
	return nil
}

// Status shows migration status
func (m *Migrator) Status(ctx context.Context) error {
	log.Println("📊 Prisma Migrate Status")
	log.Println("========================")

	if err := m.createMigrationsTable(ctx); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	migrations, err := m.loadMigrationsFromDir()
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	applied, err := m.getAppliedMigrations(ctx)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	var statusItems []MigrationStatusItem
	appliedCount := 0
	pendingCount := 0

	for _, migration := range migrations {
		appliedAt, isApplied := applied[migration.ID]
		status := "PENDING"
		if isApplied {
			status = "APPLIED"
			appliedCount++
		} else {
			pendingCount++
		}

		statusItems = append(statusItems, MigrationStatusItem{
			ID:        migration.ID,
			Name:      migration.Name,
			Status:    status,
			AppliedAt: appliedAt,
		})
	}

	status := MigrationStatus{
		TotalMigrations:   len(migrations),
		AppliedMigrations: appliedCount,
		PendingMigrations: pendingCount,
		Migrations:        statusItems,
		DatabaseStatus:    "connected",
	}

	fmt.Printf("Database: Connected\n")
	fmt.Printf("Total Migrations: %d\n", status.TotalMigrations)
	fmt.Printf("Applied: %d\n", status.AppliedMigrations)
	fmt.Printf("Pending: %d\n\n", status.PendingMigrations)

	if len(statusItems) == 0 {
		fmt.Println("No migrations found.")
		return nil
	}

	fmt.Println("Migration History:")
	fmt.Println("------------------")
	for _, item := range statusItems {
		statusIcon := "❌"
		timeStr := "Not applied"

		if item.Status == "APPLIED" {
			statusIcon = "✅"
			if item.AppliedAt != nil {
				timeStr = item.AppliedAt.Format("2006-01-02 15:04:05")
			}
		}

		fmt.Printf("%s %s\n", statusIcon, item.Name)
		fmt.Printf("   ID: %s\n", item.ID)
		fmt.Printf("   Status: %s\n", item.Status)
		fmt.Printf("   Applied: %s\n\n", timeStr)
	}

	return nil
}

// Reset resets the database
func (m *Migrator) Reset(ctx context.Context) error {
	log.Println("🗑️  WARNING: This will drop all tables and data!")

	if !m.askUserConfirmation("Are you sure you want to reset the database?") {
		log.Println("❌ Reset cancelled")
		return nil
	}

	// Create backup before reset
	if m.askUserConfirmation("Create a backup before reset?") {
		backupPath, err := m.createBackup(ctx, "Pre-reset backup")
		if err != nil {
			log.Printf("⚠️  Warning: Failed to create backup: %v", err)
			if !m.askUserConfirmation("Continue without backup?") {
				log.Println("❌ Reset cancelled")
				return nil
			}
		} else {
			log.Printf("✅ Backup created at: %s", backupPath)
		}
	}

	// Get all tables
	tables, err := m.getAllTableNames(ctx)
	if err != nil {
		return fmt.Errorf("failed to get table names: %w", err)
	}

	// Drop all tables
	for _, table := range tables {
		log.Printf("🗑️  Dropping table: %s", table)
		if _, err := m.db.Exec(ctx, fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table)); err != nil {
			log.Printf("⚠️  Warning: Failed to drop table %s: %v", table, err)
		}
	}

	// Remove migration files
	if m.askUserConfirmation("Delete all migration files?") {
		if err := os.RemoveAll(m.migrationsPath); err != nil {
			log.Printf("⚠️  Warning: Failed to remove migration files: %v", err)
		} else {
			log.Printf("🗑️  Removed migration files from: %s", m.migrationsPath)
		}
	}

	log.Println("✅ Database reset completed")
	return nil
}

// Backup creates a manual backup
func (m *Migrator) Backup(ctx context.Context, comment string) error {
	if comment == "" {
		comment = "Manual backup"
	}

	backupPath, err := m.createBackup(ctx, comment)
	if err != nil {
		return err
	}

	fmt.Printf("✅ Backup completed: %s\n", backupPath)
	return nil
}

// Restore restores from backup
func (m *Migrator) Restore(ctx context.Context, backupPath string) error {
	if _, err := os.Stat(backupPath); os.IsNotExist(err) {
		return fmt.Errorf("backup file does not exist: %s", backupPath)
	}

	log.Println("🔄 WARNING: This will overwrite all existing data!")

	if !m.askUserConfirmation("Are you sure you want to restore from backup?") {
		log.Println("❌ Restore cancelled")
		return nil
	}

	return m.restoreFromBackup(ctx, backupPath)
}

// restoreFromBackup restores database from backup file
func (m *Migrator) restoreFromBackup(ctx context.Context, backupPath string) error {
	log.Printf("🔄 Restoring database from backup: %s", backupPath)

	file, err := os.Open(backupPath)
	if err != nil {
		return fmt.Errorf("failed to open backup file: %w", err)
	}
	defer file.Close()

	var backup BackupData
	if err := json.NewDecoder(file).Decode(&backup); err != nil {
		return fmt.Errorf("failed to decode backup file: %w", err)
	}

	tx, err := m.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	tables, err := m.getAllTableNames(ctx)
	if err != nil {
		return fmt.Errorf("failed to get table names: %w", err)
	}

	// Restore tables
	for _, tableName := range tables {
		if tableName == "_prisma_migrations" {
			continue
		}

		tableData, exists := backup.Tables[tableName]
		if !exists {
			log.Printf("⚠️  Table %s not found in backup, skipping...", tableName)
			continue
		}

		tableMap := tableData.(map[string]interface{})
		columns := tableMap["columns"].([]interface{})
		data := tableMap["data"].([]interface{})

		if len(data) == 0 {
			log.Printf("ℹ️  No data to restore for table %s", tableName)
			continue
		}

		// Clear existing data
		if _, err := tx.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", tableName)); err != nil {
			log.Printf("⚠️  Warning: Failed to truncate %s: %v", tableName, err)
		}

		// Prepare column names for INSERT
		columnNames := make([]string, len(columns))
		for i, col := range columns {
			columnNames[i] = col.(string)
		}

		// Restore data
		for _, row := range data {
			rowMap := row.(map[string]interface{})
			values := make([]interface{}, len(columnNames))
			placeholders := make([]string, len(columnNames))

			for i, colName := range columnNames {
				values[i] = rowMap[colName]
				placeholders[i] = fmt.Sprintf("$%d", i+1)
			}

			columnStr := strings.Join(columnNames, ", ")
			placeholderStr := strings.Join(placeholders, ", ")
			query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", tableName, columnStr, placeholderStr)

			if _, err := tx.Exec(ctx, query, values...); err != nil {
				log.Printf("⚠️  Warning: Failed to restore row in %s: %v", tableName, err)
			}
		}

		log.Printf("✅ Restored table %s with %d rows", tableName, len(data))
	}

	// Restore _prisma_migrations table
	if migrationsData, exists := backup.Tables["_prisma_migrations"]; exists {
		tableMap := migrationsData.(map[string]interface{})
		data := tableMap["data"].([]interface{})

		for _, row := range data {
			rowMap := row.(map[string]interface{})
			_, err := tx.Exec(ctx, `
				INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) 
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
				ON CONFLICT (id) DO NOTHING
			`, rowMap["id"], rowMap["checksum"], rowMap["finished_at"], rowMap["migration_name"],
				rowMap["logs"], rowMap["rolled_back_at"], rowMap["started_at"], rowMap["applied_steps_count"])

			if err != nil {
				log.Printf("⚠️  Warning: Failed to restore migration record: %v", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit restore transaction: %w", err)
	}

	log.Printf("✅ Database restored successfully from backup created at %s", backup.Timestamp)
	return nil
}

// generateChecksum generates a checksum for content
func generateChecksum(content string) string {
	h := sha256.Sum256([]byte(content))
	return hex.EncodeToString(h[:])
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: .env file not found")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ DATABASE_URL environment variable is not set")
	}

	var (
		command        = flag.String("command", "status", "Migration command: dev, deploy, status, reset, backup, restore, generate")
		name           = flag.String("name", "", "Name for new migration (for dev/generate commands)")
		// steps          = flag.Int("steps", 1, "Number of steps for rollback")
		backupPath     = flag.String("backup", "", "Path to backup file for restore command")
		// schemaPath     = flag.String("schema", "database/schema/schema.sql", "Path to schema.sql file")
		migrationsPath = flag.String("migrations", "database/migrations", "Path to migrations directory")
	)
	flag.Parse()

	ctx := context.Background()
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatal("❌ Failed to parse database URL:", err)
	}

	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatal("❌ Failed to create connection pool:", err)
	}
	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	migrator := NewMigrator(db, *migrationsPath)

	switch *command {
	case "dev":
		if err := migrator.Dev(ctx, *name); err != nil {
			log.Fatal("❌ Dev command failed:", err)
		}
	case "deploy":
		if err := migrator.Deploy(ctx); err != nil {
			log.Fatal("❌ Deploy failed:", err)
		}
	case "status":
		if err := migrator.Status(ctx); err != nil {
			log.Fatal("❌ Status check failed:", err)
		}
	case "reset":
		if err := migrator.Reset(ctx); err != nil {
			log.Fatal("❌ Reset failed:", err)
		}
	case "backup":
		comment := *name
		if comment == "" {
			comment = "Manual backup"
		}
		if err := migrator.Backup(ctx, comment); err != nil {
			log.Fatal("❌ Backup failed:", err)
		}
	case "restore":
		if *backupPath == "" {
			log.Fatal("❌ Backup path is required for restore command. Use -backup flag")
		}
		if err := migrator.Restore(ctx, *backupPath); err != nil {
			log.Fatal("❌ Restore failed:", err)
		}
	case "generate":
		if *name == "" {
			log.Fatal("❌ Migration name is required for generate command. Use -name flag")
		}
		if err := migrator.generateMigration(*name); err != nil {
			log.Fatal("❌ Generate failed:", err)
		}
	default:
		log.Fatal("❌ Unknown command. Available commands: dev, deploy, status, reset, backup, restore, generate")
	}
}
