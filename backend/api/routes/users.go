package routes

import (
	"apiserver/controllers"
	"github.com/gofiber/fiber/v2"
)


func UsersRoutes(api fiber.Router) {
	api.Post("/register", controllers.Register)
    api.Post("/login", controllers.Login)
    api.Get("/profile", controllers.GetProfile)
}