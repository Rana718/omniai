package main

import (
    "apiserver/config"
    "apiserver/database"
    "apiserver/database/repo"
    "apiserver/helper"
    pb "apiserver/proto"
    "context"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/jackc/pgx/v5"
    "github.com/google/uuid"
)

type grpcServer struct {
    pb.UnimplementedServiceServer
}

func (s *grpcServer) GetChats(ctx context.Context, req *pb.ChatRequest) (*pb.ChatResponse, error) {
    cacheKey := "chat:" + req.DocId

    if cachedChatID, err := config.Client.Get(config.Ctx, cacheKey).Result(); err == nil {
        return &pb.ChatResponse{ChatID: cachedChatID, Message: "Chat found (cache)", IsError: false}, nil
    }

    chat, err := database.DBStore.GetChatByDocID(ctx, req.DocId)
    if err != nil {
        if err == pgx.ErrNoRows {
            return &pb.ChatResponse{ChatID: "", Message: "Chat not found", IsError: true}, nil
        }
        return &pb.ChatResponse{ChatID: "", Message: "Database error", IsError: true}, err
    }

    config.Client.Set(config.Ctx, cacheKey, chat.ID.String(), 20*time.Minute)
    return &pb.ChatResponse{ChatID: chat.ID.String(), Message: "Chat found", IsError: false}, nil
}

func (s *grpcServer) CreateChat(ctx context.Context, req *pb.CreateRequest) (*pb.CreateResponse, error) {
    cacheKey := "chat:" + req.DocId
    existingChat, err := database.DBStore.GetChatByDocID(ctx, req.DocId)
    if err == nil {
        return &pb.CreateResponse{ChatID: existingChat.ID.String(), Message: "Chat already exists", IsError: false}, nil
    } else if err != pgx.ErrNoRows {
        return &pb.CreateResponse{ChatID: "", Message: "Database error", IsError: true}, err
    }

    userID, err := uuid.Parse(req.UserId)
    if err != nil {
        return &pb.CreateResponse{ChatID: "", Message: "Invalid user ID format", IsError: true}, err
    }

    chat, err := database.DBStore.CreateChat(ctx, repo.CreateChatParams{
        UserID:  userID,
        DocID:   req.DocId,
        DocText: req.DocText,
    })
    
    if err != nil {
        return &pb.CreateResponse{ChatID: "", Message: "Failed to create chat", IsError: true}, err
    }

    config.Client.Set(config.Ctx, cacheKey, chat.ID.String(), 20*time.Minute)
    purgeUserChatCache(req.UserId)

    return &pb.CreateResponse{ChatID: chat.ID.String(), Message: "Chat created", IsError: false}, nil
}

func (s *grpcServer) AuthenticateUser(ctx context.Context, req *pb.AuthenticateRequest) (*pb.AuthenticateResponse, error) {
    token, err := jwt.Parse(req.JwtToken, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, jwt.ErrSignatureInvalid
        }
        return []byte(helper.SECRET_KEY), nil
    })
    if err != nil {
        return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: "try"}, nil
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok || !token.Valid {
        return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: "okfuck"}, nil
    }

    email, ok := claims["sub"].(string)
    if !ok || email == "" || isTokenExpired(claims) {
        return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: "emailfuck"}, nil
    }

    user, err := helper.GetUserFromCache(email)
    if err != nil {
        dbUser, err := database.DBStore.GetUserByEmail(ctx, email)
        if err != nil {
            if err == pgx.ErrNoRows {
                return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: "dbch"}, nil
            }
            return &pb.AuthenticateResponse{IsAuthenticate: false, UserId: "dbs"}, err
        }
        user = &dbUser
        helper.SetUserInCache(email, user)
    }

    return &pb.AuthenticateResponse{IsAuthenticate: true, UserId: user.ID.String()}, nil
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