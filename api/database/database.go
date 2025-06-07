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


func ConnectDatabase() {
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL environment variable is not set")
    }

    config := &gorm.Config{
        Logger: logger.Default.LogMode(logger.Warn), 
        PrepareStmt: true, 
        DisableForeignKeyConstraintWhenMigrating: false,
    }

    var err error
    DB, err = gorm.Open(postgres.Open(dbURL), config)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    sqlDB, err := DB.DB()
    if err != nil {
        log.Fatal("Failed to get underlying SQL DB:", err)
    }

    sqlDB.SetMaxIdleConns(5)                
    sqlDB.SetMaxOpenConns(100)               
    sqlDB.SetConnMaxLifetime(time.Hour)      

    log.Println("Database connection established with optimized settings")
}