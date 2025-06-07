package models

// import (
//     "time"
// )

// type QAHistory struct {
//     ID        string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
//     ChatID    string    `gorm:"type:uuid;not null;index" json:"chat_id"`
//     Chat      Chat      `gorm:"foreignKey:ChatID;constraint:OnDelete:CASCADE" json:"chat,omitempty"`
//     Question  string    `gorm:"type:text;not null" json:"question"`
//     Answer    string    `gorm:"type:text;not null" json:"answer"`
//     Timestamp time.Time `gorm:"type:text;not null" json:"timestamp"`
// }
