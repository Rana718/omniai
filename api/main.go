package main

import (
	"apiserver/database"
	"apiserver/middleware"
	"apiserver/services"
	"log"
	"os"

	"apiserver/config"
	"apiserver/routes"

	"net"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	pb "apiserver/proto"

	"google.golang.org/grpc"
)

func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}
	config.InitRedis()

	database.ConnectDatabase()
}

func main() {
	go services.InitRabbitMQConsumer()

	go func() {
		grpcPort := ":50051"
		lis, err := net.Listen("tcp", grpcPort)
		if err != nil {
			log.Fatalf("failed to listen on %s: %v", grpcPort, err)
		}

		grpcSrv := grpc.NewServer()
		pb.RegisterServiceServer(grpcSrv, &grpcServer{})

		log.Printf("gRPC server running on %s", grpcPort)
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC server: %v", err)
		}
	}()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${ip} ${status} - ${method} ${path} (${latency})\n",
	}))

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "*",
		AllowHeaders: "*",
	}))

	app.Use(middleware.JWTAuthMiddleware())

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "PDF Chatter API inin",
			"status":  "healthy",
		})
	})

	routes.UsersRoutes(app)
	routes.PdfsRoutes(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
