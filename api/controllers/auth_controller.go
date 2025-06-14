package controllers

import (
	"apiserver/database"
	"apiserver/database/repo"
	"apiserver/helper"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
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

	_, err := database.DBStore.GetUserByEmail(c.Context(), input.Email)
	if err == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"detail": "User already exists"})
	}

	hashedPassword, err := helper.HashPassword(input.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	user, err := database.DBStore.CreateUser(c.Context(), repo.CreateUserParams{
		Name:           input.Name,
		Email:          input.Email,
		HashedPassword: hashedPassword,
		Image:          pgtype.Text{Valid: false},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	token, err := helper.GenerateToken(user.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	helper.SetUserInCache(user.Email, &user)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
		"access_token": token,
	})
}

func Login(c *fiber.Ctx) error {
	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	user, err := database.DBStore.GetUserByEmail(c.Context(), input.Email)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"detail": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"detail": "Database error"})
	}

	if err := helper.CheckPassword(user.HashedPassword, input.Password); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	token, err := helper.GenerateToken(user.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"message": "Login successful",
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
		"access_token": token,
	})
}

func GetProfile(c *fiber.Ctx) error {
	authUser, ok := c.Locals("user").(*repo.User)
	if !ok || authUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found in context"})
	}

	user, err := helper.GetUserFromCache(authUser.Email)
	if err != nil || user == nil {
		var dbUser repo.User
		ctx := c.Context()
		dbUser, err := database.DBStore.GetUserByEmail(ctx, authUser.Email)

		if err != nil {
			if err == pgx.ErrNoRows {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"detail": "User not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"detail": "Database error"})
		}

		user = &dbUser
		helper.SetUserInCache(user.Email, user)
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":         user.ID,
			"name":       user.Name,
			"email":      user.Email,
			"image":      user.Image,
			"created_at": user.CreatedAt,
			"updated_at": user.UpdatedAt,
		},
	})
}
