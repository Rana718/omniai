package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Chat struct {
    ID        string      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    UserID    string      `gorm:"type:uuid;not null;index" json:"user_id"`
    User      User        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
    DocID     string      `gorm:"not null" json:"doc_id"`
    DocText   string      `gorm:"type:text;not null" json:"doc_text"`
    CreatedAt time.Time   `json:"created_at"`
    Histories []QAHistory `gorm:"foreignKey:ChatID" json:"histories,omitempty"`
}

type QAHistory struct {
    ID        string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    ChatID    string    `gorm:"type:uuid;not null;index" json:"chat_id"`
    Chat      Chat      `gorm:"foreignKey:ChatID;constraint:OnDelete:CASCADE" json:"chat,omitempty"`
    Question  string    `gorm:"type:text;not null" json:"question"`
    Answer    string    `gorm:"type:text;not null" json:"answer"`
    Timestamp time.Time `gorm:"type:text;not null" json:"timestamp"`
}


func (c *Chat) BeforeCreate(tx *gorm.DB) error {
    if c.ID == "" {
        c.ID = uuid.New().String()
    }
    return nil
}