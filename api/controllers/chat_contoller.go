package controllers

import (
	"apiserver/config"
	"apiserver/database"
	"apiserver/database/repo"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type ChatResponse struct {
	DocID     string `json:"doc_id"`
	DocText   string `json:"doc_text"`
	CreatedAt string `json:"created_at"`
	UserID    string `json:"user_id"`
}

type HistoryItem struct {
	ID        string `json:"id"`
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	Timestamp string `json:"timestamp"`
}

type HistoryResponse struct {
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	Timestamp string `json:"timestamp"`
}

func GetAllChats(c *fiber.Ctx) error {
	user := c.Locals("user").(*repo.User)
	userID := user.ID

	cacheKey := fmt.Sprintf("user_chats:%s", userID)
	cachedData, err := config.Client.Get(config.Ctx, cacheKey).Result()

	if err == nil {
		var cachedChats []ChatResponse
		if json.Unmarshal([]byte(cachedData), &cachedChats) == nil {
			return c.JSON(cachedChats)
		}
	}

	chats, err := database.DBStore.GetUserChats(c.Context(), userID)

	if err != nil {
		if err == pgx.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"detail": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"detail": "Database error"})
	}

	var response []ChatResponse
	for _, chat := range chats {
		response = append(response, ChatResponse{
			DocID:     chat.DocID,
			DocText:   chat.DocText,
			CreatedAt: formatTimestamptz(chat.CreatedAt),
			UserID:    chat.UserID.String(),
		})
	}

	responseJSON, _ := json.Marshal(response)
	config.Client.Set(config.Ctx, cacheKey, responseJSON, 10*time.Minute)

	return c.JSON(response)
}

func formatTimestamptz(ts pgtype.Timestamptz) string {
	if ts.Valid {
		return ts.Time.Format("2006-01-02T15:04:05Z07:00")
	}
	return ""
}

func GetChatHistory(c *fiber.Ctx) error {
	chatID := c.Params("id")

	// Parse string chatID to UUID
	chatUUID, err := uuid.Parse(chatID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid chat ID format",
		})
	}

	chatInfo, err := database.DBStore.GetChatByID(c.Context(), chatUUID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat",
		})
	}

	var allHistory []HistoryItem
	seenIDs := make(map[string]bool)

	redisKey := "chat_history_temp:" + chatID
	redisData, err := config.Client.LRange(config.Ctx, redisKey, 0, -1).Result()

	if err == nil && len(redisData) > 0 {
		for i := len(redisData) - 1; i >= 0; i-- {
			var qaData map[string]interface{}
			if err := json.Unmarshal([]byte(redisData[i]), &qaData); err != nil {
				continue
			}

			id := qaData["id"].(string)
			if !seenIDs[id] {
				allHistory = append(allHistory, HistoryItem{
					ID:        id,
					Question:  qaData["question"].(string),
					Answer:    qaData["answer"].(string),
					Timestamp: qaData["timestamp"].(string),
				})
				seenIDs[id] = true
			}
		}
	}

	// Get DB data and merge (avoiding duplicates)
	dbHistory, err := database.DBStore.GetQAHistoriesByChatID(c.Context(), chatUUID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch history",
		})
	}

	for _, h := range dbHistory {
		if !seenIDs[h.ID.String()] {
			allHistory = append(allHistory, HistoryItem{
				ID:        h.ID.String(),
				Question:  h.Question,
				Answer:    h.Answer,
				Timestamp: formatTimestamptz(h.Timestamp),
			})
			seenIDs[h.ID.String()] = true
		}
	}

	// Sort by timestamp
	sort.Slice(allHistory, func(i, j int) bool {
		timeI, errI := time.Parse(time.RFC3339, allHistory[i].Timestamp)
		timeJ, errJ := time.Parse(time.RFC3339, allHistory[j].Timestamp)

		// Handle parsing errors
		if errI != nil || errJ != nil {
			return false
		}

		return timeI.Before(timeJ)
	})

	// Convert to response format
	var historyResponse []HistoryResponse
	for _, item := range allHistory {
		historyResponse = append(historyResponse, HistoryResponse{
			Question:  item.Question,
			Answer:    item.Answer,
			Timestamp: item.Timestamp,
		})
	}

	return c.JSON(fiber.Map{
		"docsname": chatInfo.DocText,
		"history":  historyResponse,
	})
}
