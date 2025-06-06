package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// Chat represents a chat session in the database
type Chat struct {
    ID        string      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    UserID    string      `gorm:"type:uuid;not null;index" json:"user_id"`
    User      User        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
    DocID     string      `gorm:"not null" json:"doc_id"`
    DocText   string      `gorm:"type:text;not null" json:"doc_text"`
    CreatedAt time.Time   `json:"created_at"`
    Histories []QAHistory `gorm:"foreignKey:ChatID" json:"histories,omitempty"`
}

func (c *Chat) BeforeCreate(tx *gorm.DB) error {
    if c.ID == "" {
        c.ID = uuid.New().String()
    }
    return nil
}