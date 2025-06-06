package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
    "golang.org/x/crypto/bcrypt"
)

type User struct {
    ID             string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    Email          string    `gorm:"uniqueIndex;not null" json:"email"`
    Name           string    `gorm:"not null" json:"name"`
    HashedPassword string    `gorm:"not null" json:"-"`
    Image          *string   `json:"image"` 
    Chats          []Chat    `gorm:"foreignKey:UserID" json:"chats,omitempty"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == "" {
        u.ID = uuid.New().String()
    }
    return nil
}

func (u *User) HashPassword() error {
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.HashedPassword), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    u.HashedPassword = string(hashedPassword)
    return nil
}

func (u *User) CheckPassword(password string) error {
    return bcrypt.CompareHashAndPassword([]byte(u.HashedPassword), []byte(password))
}