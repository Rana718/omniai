package database

import (
    "log"
    "os"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectDatabase initializes the database connection with optimized settings
func ConnectDatabase() {
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL environment variable is not set")
    }

    // Configure GORM with optimizations
    config := &gorm.Config{
        Logger: logger.Default.LogMode(logger.Warn), // Only log warnings and errors in production
        PrepareStmt: true, // Enable prepared statement caching
        DisableForeignKeyConstraintWhenMigrating: false,
    }

    var err error
    DB, err = gorm.Open(postgres.Open(dbURL), config)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Get underlying SQL DB to configure connection pool
    sqlDB, err := DB.DB()
    if err != nil {
        log.Fatal("Failed to get underlying SQL DB:", err)
    }

    // Configure connection pool for better performance
    sqlDB.SetMaxIdleConns(10)                // Maximum idle connections
    sqlDB.SetMaxOpenConns(100)               // Maximum open connections
    sqlDB.SetConnMaxLifetime(time.Hour)      // Connection max lifetime

    log.Println("Database connection established with optimized settings")
}