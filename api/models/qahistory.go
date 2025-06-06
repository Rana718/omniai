package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type QAHistory struct {
    ID        string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    ChatID    string    `gorm:"type:uuid;not null;index" json:"chat_id"`
    Chat      Chat      `gorm:"foreignKey:ChatID;constraint:OnDelete:CASCADE" json:"chat,omitempty"`
    Question  string    `gorm:"type:text;not null" json:"question"`
    Answer    string    `gorm:"type:text;not null" json:"answer"`
    Timestamp time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"timestamp"`
}

func (qa *QAHistory) BeforeCreate(tx *gorm.DB) error {
    if qa.ID == "" {
        qa.ID = uuid.New().String()
    }
    return nil
}