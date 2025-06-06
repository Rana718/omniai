package middleware

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"

	"apiserver/config"
	"apiserver/database"
	"apiserver/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var (
	SECRET_KEY = getEnvOrDefault("JWT_SECRET", "supersecret")
)

var PUBLIC_URLS = []string{
	"/",
	"/api/auth/register",
	"/api/auth/login",
	"/health",
	"/docs/*",
	"/static/*",
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func isPublicPath(path string) bool {
	for _, pattern := range PUBLIC_URLS {
		if strings.HasSuffix(pattern, "/*") {
			prefix := strings.TrimSuffix(pattern, "/*")
			if strings.HasPrefix(path, prefix) {
				return true
			}
		} else if matched, _ := filepath.Match(pattern, path); matched || pattern == path {
			return true
		}
	}
	return false
}

func getUserFromCache(email string) (*models.User, error) {
	data, err := config.Client.Get(config.Ctx, "user:"+email).Result()
	if err != nil {
		return nil, err
	}
	var user models.User
	if err := json.Unmarshal([]byte(data), &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func setUserInCache(email string, user *models.User) {
	data, err := json.Marshal(user)
	if err != nil {
		return
	}
	_ = config.Client.Set(config.Ctx, "user:"+email, data, 15*time.Minute).Err()
}

func ClearUserFromCache(email string) error {
	return config.Client.Del(config.Ctx, "user:"+email).Err()
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

func JWTAuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		path := c.Path()
		if c.Method() == "OPTIONS" || isPublicPath(path) {
			return c.Next()
		}

		authHeader := c.Get("Authorization")
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"detail": "Authorization token missing or invalid"})
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(SECRET_KEY), nil
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"detail": "Invalid or expired token"})
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			email, ok := claims["sub"].(string)
			if !ok || email == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"detail": "Invalid token payload"})
			}

			user, err := getUserFromCache(email)
			if err != nil {
				var dbUser models.User
				result := database.DB.Select("id", "email", "name", "image", "created_at", "updated_at").
					Where("email = ?", email).
					First(&dbUser)

				if result.Error != nil {
					if result.Error == gorm.ErrRecordNotFound {
						return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"detail": "User not found"})
					}
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"detail": "Database error"})
				}

				user = &dbUser
				setUserInCache(email, user)
			}

			c.Locals("user", user)
			return c.Next()
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"detail": "Invalid token claims"})
	}
}
