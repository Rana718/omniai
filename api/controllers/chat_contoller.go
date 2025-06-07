package controllers

import (
	"apiserver/config"
	"apiserver/database"
	"apiserver/models"
	"encoding/json"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func GetAllChats(c *fiber.Ctx) error {
	user := c.Locals("user").(*models.User)
	userID := user.ID

	var chats []models.Chat

	result := database.DB.
		Select("doc_id, doc_text, created_at, user_id").
		Where("user_id = ?", userID).
		Order("created_at DESC"). 
		Find(&chats)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chats",
		})
	}

	type ChatResponse struct {
		DocID     string `json:"doc_id"`
		DocText   string `json:"doc_text"`
		CreatedAt string `json:"created_at"`
		UserID    string `json:"user_id"`
	}

	var response []ChatResponse
	for _, chat := range chats {
		response = append(response, ChatResponse{
			DocID:     chat.DocID,
			DocText:   chat.DocText,
			CreatedAt: chat.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UserID:    chat.UserID,
		})
	}

	return c.JSON(response)
}

func GetChatHistory(c *fiber.Ctx) error {
	chatID := c.Params("id")

	var chat models.Chat
	err := database.DB.
		Select("doc_text, id").
		Where("doc_id = ?", chatID).
		First(&chat).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat",
		})
	}

	type HistoryItem struct {
		ID        string `json:"id"`
		Question  string `json:"question"`
		Answer    string `json:"answer"`
		Timestamp string `json:"timestamp"`
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
	var dbHistory []models.QAHistory
	err = database.DB.
		Select("id, question, answer, timestamp").
		Where("chat_id = ?", chat.ID).
		Order("timestamp ASC").
		Find(&dbHistory).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch history",
		})
	}

	for _, h := range dbHistory {
		if !seenIDs[h.ID] {
			allHistory = append(allHistory, HistoryItem{
				ID:        h.ID,
				Question:  h.Question,
				Answer:    h.Answer,
				Timestamp: h.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
			})
			seenIDs[h.ID] = true
		}
	}

	// Sort by timestamp
	sort.Slice(allHistory, func(i, j int) bool {
		timeI, _ := time.Parse(time.RFC3339, allHistory[i].Timestamp)
		timeJ, _ := time.Parse(time.RFC3339, allHistory[j].Timestamp)
		return timeI.Before(timeJ)
	})

	// Convert to response format
	type HistoryResponse struct {
		Question  string `json:"question"`
		Answer    string `json:"answer"`
		Timestamp string `json:"timestamp"`
	}

	var historyResponse []HistoryResponse
	for _, item := range allHistory {
		historyResponse = append(historyResponse, HistoryResponse{
			Question:  item.Question,
			Answer:    item.Answer,
			Timestamp: item.Timestamp,
		})
	}

	return c.JSON(fiber.Map{
		"docsname": chat.DocText,
		"history":  historyResponse,
	})
}
