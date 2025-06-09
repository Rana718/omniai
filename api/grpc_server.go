package main

import (
	"apiserver/config"
	"apiserver/database"
	"apiserver/helper"
	"apiserver/models"
	pb "apiserver/proto"
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type grpcServer struct {
	pb.UnimplementedServiceServer
}

func (s *grpcServer) GetChats(ctx context.Context, req *pb.ChatRequest) (*pb.ChatResponse, error) {
	cacheKey := "chat:" + req.DocId

	if cachedChatID, err := config.Client.Get(config.Ctx, cacheKey).Result(); err == nil {
		return &pb.ChatResponse{ChatID: cachedChatID, Message: "Chat found (cache)", IsError: false}, nil
	}

	var chat models.Chat
	if err := database.DB.Select("id").Where("doc_id = ?", req.DocId).First(&chat).Error; err != nil {
		return &pb.ChatResponse{ChatID: "", Message: "Chat not found", IsError: true}, nil
	}

	config.Client.Set(config.Ctx, cacheKey, chat.ID, 20*time.Minute)
	return &pb.ChatResponse{ChatID: chat.ID, Message: "Chat found", IsError: false}, nil
}

func (s *grpcServer) CreateChat(ctx context.Context, req *pb.CreateRequest) (*pb.CreateResponse, error) {
	cacheKey := "chat:" + req.DocId

	var existingChat models.Chat
	if err := database.DB.Where("doc_id = ?", req.DocId).First(&existingChat).Error; err == nil {
		config.Client.Set(config.Ctx, cacheKey, existingChat.ID, 20*time.Minute)
		return &pb.CreateResponse{ChatID: existingChat.ID, Message: "Chat already exists", IsError: false}, nil
	}

	chat := models.Chat{UserID: req.UserId, DocID: req.DocId, DocText: req.DocText}
	if err := database.DB.Create(&chat).Error; err != nil {
		return &pb.CreateResponse{ChatID: "", Message: "Create failed", IsError: true}, nil
	}

	config.Client.Set(config.Ctx, cacheKey, chat.ID, 20*time.Minute)
	purgeUserChatCache(req.UserId)

	return &pb.CreateResponse{ChatID: chat.ID, Message: "Chat created", IsError: false}, nil
}

func (s *grpcServer) AuthenticateUser(ctx context.Context, req *pb.AuthenticateRequest) (*pb.AuthenticateResponse, error) {
	token, err := jwt.Parse(req.JwtToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(helper.SECRET_KEY), nil
	})
	if err != nil {
		return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: ""}, nil
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: ""}, nil
	}

	email, ok := claims["sub"].(string)
	if !ok || email == "" || isTokenExpired(claims) {
		return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: ""}, nil
	}

	user, err := helper.GetUserFromCache(email)
	if err != nil {
		var dbUser models.User
		if err := database.DB.Select("id", "email").Where("email = ?", email).First(&dbUser).Error; err != nil {
			return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: ""}, nil
		}
		user = &dbUser
		helper.SetUserInCache(email, user)
	}

	return &pb.AuthenticateResponse{IsAuthenticate: true, UserId: user.ID}, nil
}

func isTokenExpired(claims jwt.MapClaims) bool {
	if exp, ok := claims["exp"].(float64); ok {
		return time.Now().Unix() > int64(exp)
	}
	return false
}

func purgeUserChatCache(userID string) {
	cacheKey := fmt.Sprintf("user_chats:%s", userID)
	config.Client.Del(config.Ctx, cacheKey)
}
