package routes

import (
	"apiserver/controllers"

	"github.com/gofiber/fiber/v2"
)

func PdfsRoutes(api fiber.Router) {
	api.Get("/pdfchat", controllers.GetAllChats)
	api.Get("/pdfchat/:id", controllers.GetChatHistory)
}
