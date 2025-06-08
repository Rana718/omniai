package main

import (
	"apiserver/config"
	"apiserver/database"
	"apiserver/helper"
	"apiserver/models"
	pb "apiserver/proto"

	"context"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type grpcServer struct {
	pb.UnimplementedServiceServer
}

func (s *grpcServer) GetChats(ctx context.Context, req *pb.ChatRequest) (*pb.ChatResponse, error) {
	cacheKey := "chat:" + req.DocId

	// Check Redis cache first
	cachedChatID, err := config.Client.Get(config.Ctx, cacheKey).Result()
	if err == nil {
		return &pb.ChatResponse{
			ChatID:  cachedChatID,
			Message: "Chat found successfully (from cache)",
			IsError: false,
		}, nil
	}

	// Search by doc_id, not id
	var chat models.Chat
	err = database.DB.Select("id", "doc_id", "user_id").Where("doc_id = ?", req.DocId).First(&chat).Error

	if err != nil {
		log.Printf("Chat not found for doc_id %s: %v", req.DocId, err)
		return &pb.ChatResponse{
			ChatID:  "",
			Message: "Chat not found",
			IsError: true,
		}, nil // Return nil error to avoid gRPC failure
	}

	// Cache the result
	err = config.Client.Set(config.Ctx, cacheKey, chat.ID, 20*time.Minute).Err()
	if err != nil {
		log.Printf("Failed to cache chat in Redis: %v", err)
	}

	return &pb.ChatResponse{
		ChatID:  chat.ID,
		Message: "Chat found successfully",
		IsError: false,
	}, nil
}

func (s *grpcServer) CreateChat(ctx context.Context, req *pb.CreateRequest) (*pb.CreateResponse, error) {
	log.Printf("Creating chat for doc_id: %s, user_id: %s", req.DocId, req.UserId)

	cacheKey := "chat:" + req.DocId

	// Check if chat already exists
	var existingChat models.Chat
	err := database.DB.Where("doc_id = ?", req.DocId).First(&existingChat).Error
	if err == nil {
		// Chat already exists, return it
		log.Printf("Chat already exists for doc_id: %s", req.DocId)

		// Cache it
		config.Client.Set(config.Ctx, cacheKey, existingChat.ID, 20*time.Minute)

		return &pb.CreateResponse{
			ChatID:  existingChat.ID,
			Message: "Chat already exists",
			IsError: false,
		}, nil
	}

	// Create new chat
	chat := models.Chat{
		UserID:  req.UserId,
		DocID:   req.DocId,
		DocText: req.DocText,
	}

	if err := database.DB.Create(&chat).Error; err != nil {
		log.Printf("Failed to create chat: %v", err)
		return &pb.CreateResponse{
			ChatID:  "",
			Message: "Failed to create chat",
			IsError: true,
		}, nil // Return nil error to avoid gRPC failure
	}

	// Cache the new chat
	err = config.Client.Set(config.Ctx, cacheKey, chat.ID, 20*time.Minute).Err()
	if err != nil {
		log.Printf("Failed to cache chat in Redis: %v", err)
	}

	log.Printf("Successfully created chat with ID: %s", chat.ID)
	return &pb.CreateResponse{
		ChatID:  chat.ID,
		Message: "Chat created successfully",
		IsError: false,
	}, nil
}

func (s *grpcServer) AuthenticateUser(ctx context.Context, req *pb.AuthenticateRequest) (*pb.AuthenticateResponse, error) {
    log.Printf("Authenticating token: %s", req.JwtToken[:20]+"...") // Log first 20 chars for debugging

    token, err := jwt.Parse(req.JwtToken, func(token *jwt.Token) (interface{}, error) {
        // Check the signing method
        if method, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            log.Printf("Unexpected signing method: %v", token.Header["alg"])
            return nil, jwt.ErrSignatureInvalid
        } else {
            log.Printf("Using signing method: %v", method.Alg())
        }
        
        // Log the secret key length for debugging (don't log the actual key)
        secretKey := []byte(helper.SECRET_KEY)
        log.Printf("Secret key length: %d", len(secretKey))
        
        return secretKey, nil
    })

    if err != nil {
        log.Printf("Token parsing failed: %v", err)
        return &pb.AuthenticateResponse{
            IsAuthenticate: false, // Note: This should match the proto field name
            UserId:         "",
        }, nil
    }

    if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
        log.Printf("Token is valid, extracting claims")
        
        email, ok := claims["sub"].(string)
        if !ok || email == "" {
            log.Printf("Invalid token payload: missing or invalid email")
            return &pb.AuthenticateResponse{
                IsAuthenticate: false,
                UserId:         "",
            }, nil
        }

        // Check token expiration manually if needed
        if exp, ok := claims["exp"].(float64); ok {
            if time.Now().Unix() > int64(exp) {
                log.Printf("Token has expired")
                return &pb.AuthenticateResponse{
                    IsAuthenticate: false,
                    UserId:         "",
                }, nil
            }
        }

        user, err := helper.GetUserFromCache(email)
        if err != nil {
            log.Printf("User not in cache, checking database for email: %s", email)

            var dbUser models.User
            result := database.DB.Select("id", "email").
                Where("email = ?", email).
                First(&dbUser)

            if result.Error != nil {
                if result.Error == gorm.ErrRecordNotFound {
                    log.Printf("User not found in database: %s", email)
                    return &pb.AuthenticateResponse{
                        IsAuthenticate: false,
                        UserId:         "",
                    }, nil
                }
                log.Printf("Database error: %v", result.Error)
                return &pb.AuthenticateResponse{
                    IsAuthenticate: false,
                    UserId:         "",
                }, nil
            }

            user = &dbUser
            helper.SetUserInCache(email, user)
        }

        log.Printf("User authenticated successfully: %s", user.ID)
        return &pb.AuthenticateResponse{
            IsAuthenticate: true,
            UserId:         user.ID,
        }, nil
    }

    log.Printf("Invalid token claims")
    return &pb.AuthenticateResponse{
        IsAuthenticate: false,
        UserId:         "",
    }, nil
}
