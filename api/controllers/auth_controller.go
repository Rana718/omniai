package controllers

import (
    "apiserver/database"
    "apiserver/middleware"
    "apiserver/models"
    "github.com/gofiber/fiber/v2"
    "gorm.io/gorm"
)

type RegisterInput struct {
    Name     string `json:"name" validate:"required"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=6"`
}

type LoginInput struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required"`
}

func Register(c *fiber.Ctx) error {
    var input RegisterInput
    if err := c.BodyParser(&input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
    }

    var existingUser models.User
    err := database.DB.Select("id").Where("email = ?", input.Email).First(&existingUser).Error
    if err == nil {
        return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User with this email already exists"})
    } else if err != gorm.ErrRecordNotFound {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error occurred"})
    }

    user := models.User{
        Name:           input.Name,
        Email:          input.Email,
        HashedPassword: input.Password,
    }

    if err := user.HashPassword(); err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
    }

    if err := database.DB.Create(&user).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
    }

    token, err := middleware.GenerateToken(user.Email)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
    }

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{
        "message": "User registered successfully",
        "user": fiber.Map{
            "id":         user.ID,
            "name":       user.Name,
            "email":      user.Email,
        },
        "access_token": token,
    })
}

func Login(c *fiber.Ctx) error {
    var input LoginInput
    if err := c.BodyParser(&input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
    }

    var user models.User
    err := database.DB.Where("email = ?", input.Email).First(&user).Error
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
        }
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error occurred"})
    }

    if err := user.CheckPassword(input.Password); err != nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
    }

    token, err := middleware.GenerateToken(user.Email)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
    }

    return c.JSON(fiber.Map{
        "message": "Login successful",
        "user": fiber.Map{
            "id":         user.ID,
            "name":       user.Name,
            "email":      user.Email,
        },
        "access_token": token,
    })
}

func GetProfile(c *fiber.Ctx) error {
    user, ok := c.Locals("user").(*models.User)
    if !ok {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found in context"})
    }

    var currentUser models.User
    if err := database.DB.Select("id", "name", "email", "image", "created_at", "updated_at").
        Where("id = ?", user.ID).First(&currentUser).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch user profile"})
    }

    return c.JSON(fiber.Map{
        "user": fiber.Map{
            "id":         currentUser.ID,
            "name":       currentUser.Name,
            "email":      currentUser.Email,
            "image":      currentUser.Image,
            "created_at": currentUser.CreatedAt,
            "updated_at": currentUser.UpdatedAt,
        },
    })
}
