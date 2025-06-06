package middleware

import (
    "os"
    "path/filepath"
    "strings"
    "time"

    "apiserver/database"
    "apiserver/models"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
)

var (
    SECRET_KEY = getEnvOrDefault("JWT_SECRET", "supersecret")
    ALGORITHM  = "HS256"
)

// Public URL patterns that don't require authentication
var PUBLIC_URLS = []string{
    "/",
    "/api/register",
    "/api/login",
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

// isPublicPath checks if the given path matches any public URL pattern
func isPublicPath(path string) bool {
    for _, pattern := range PUBLIC_URLS {
        // Handle wildcard patterns
        if strings.HasSuffix(pattern, "/*") {
            prefix := strings.TrimSuffix(pattern, "/*")
            if strings.HasPrefix(path, prefix) {
                return true
            }
        } else if matched, _ := filepath.Match(pattern, path); matched {
            return true
        } else if pattern == path {
            return true
        }
    }
    return false
}

// GenerateToken creates a new JWT token for a given user email (valid for 30 days)
func GenerateToken(email string) (string, error) {
    // Create the token claims
    claims := jwt.MapClaims{
        "sub": email, // Subject (user email)
        "exp": time.Now().Add(time.Hour * 24 * 30).Unix(), // Token expires in 30 days
        "iat": time.Now().Unix(),                          // Issued at
        "iss": "pdf-chatter-api",                          // Issuer
    }

    // Create token with claims
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    // Generate the signed token
    tokenString, err := token.SignedString([]byte(SECRET_KEY))
    if err != nil {
        return "", err
    }

    return tokenString, nil
}

// JWTAuthMiddleware verifies the JWT token for protected routes
func JWTAuthMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        path := c.Path()

        // Allow OPTIONS requests
        if c.Method() == "OPTIONS" {
            return c.Next()
        }

        // Check if path is public
        if isPublicPath(path) {
            return c.Next()
        }

        // Get Authorization header
        authHeader := c.Get("Authorization")
        if authHeader == "" {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "detail": "Authorization token missing",
            })
        }

        // Check if the Authorization header has the correct format
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "detail": "Authorization header format must be Bearer {token}",
            })
        }

        // Extract the token
        tokenString := parts[1]

        // Parse and validate the token
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            // Validate the signing method
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, jwt.ErrSignatureInvalid
            }
            return []byte(SECRET_KEY), nil
        })

        if err != nil {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "detail": "Invalid or expired token",
            })
        }

        // Check if the token is valid and extract claims
        if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
            // Get email from token subject
            email, ok := claims["sub"].(string)
            if !ok || email == "" {
                return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                    "detail": "Invalid token payload",
                })
            }

            // Find user by email
            var user models.User
            if result := database.DB.Where("email = ?", email).First(&user); result.Error != nil {
                return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                    "detail": "User not found",
                })
            }

            // Set user in context
            c.Locals("user", &user)
            return c.Next()
        }

        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "detail": "Invalid token claims",
        })
    }
}