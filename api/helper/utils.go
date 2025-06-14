package helper

import (
	"apiserver/config"
	"apiserver/database/repo"
	"encoding/json"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	SECRET_KEY = GetEnvOrDefault("JWT_SECRET", "supersecret")
)

func GetUserFromCache(email string) (*repo.User, error) {
	data, err := config.Client.Get(config.Ctx, "user:"+email).Result()
	if err != nil {
		return nil, err
	}
	var user repo.User
	if err := json.Unmarshal([]byte(data), &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func SetUserInCache(email string, user *repo.User) {
	data, err := json.Marshal(user)
	if err != nil {
		return
	}
	_ = config.Client.Set(config.Ctx, "user:"+email, data, 15*time.Minute).Err()
}

func GenerateToken(email string) (string, error) {
	claims := jwt.MapClaims{
		"sub": email,
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"iss": "pdf-chatter-api",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(SECRET_KEY))
}

func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func HashPassword(password string) (string, error) {
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return "", err
    }
    return string(hashedPassword), nil
}

func CheckPassword(hashedPassword, password string) error {
    return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
