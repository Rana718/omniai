package middleware

import (
	"apiserver/database"
	"apiserver/database/repo"
	"apiserver/helper"
	"context"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
)

var PUBLIC_URLS = []string{
	"/",
	"/register",
	"/login",
	"/health",
	"/docs/*",
	"/static/*",
	"/metrics",
}

var (
	SECRET_KEY = helper.GetEnvOrDefault("JWT_SECRET", "supersecret")
)

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

			user, err := helper.GetUserFromCache(email)
			if err != nil {
				ctx := context.Background()
				var dbUser repo.User
				dbUser, err := database.DBStore.GetUserByEmail(ctx, email)

				if err != nil {
					if err == pgx.ErrNoRows {
						return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"detail": "User not found"})
					}
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"detail": "Database error"})
				}

				user = &dbUser
				helper.SetUserInCache(email, user)
			}

			c.Locals("user", user)
			return c.Next()
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"detail": "Invalid token claims"})
	}
}
