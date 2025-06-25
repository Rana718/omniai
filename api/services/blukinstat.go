package services

import (
	"apiserver/database"
	"apiserver/database/repo"
	"apiserver/helper"
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/streadway/amqp"
)

type QAMessage struct {
	DocID     string `json:"doc_id"`
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
}

var messageBuffer []QAMessage
var bufferTicker *time.Ticker

func InitRabbitMQConsumer() {
	rabbitmqURL := helper.GetEnvOrDefault("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"pdf_chat",
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name,
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	bufferTicker = time.NewTicker(30 * time.Second)
	go bulkInsertWorker()

	log.Println("RabbitMQ Consumer started. Waiting for messages...")

	for d := range msgs {
		var message QAMessage
		if err := json.Unmarshal(d.Body, &message); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			d.Nack(false, false)
			continue
		}

		messageBuffer = append(messageBuffer, message)

		d.Ack(false)
		log.Printf("Processed message for doc_id: %s", message.DocID)
	}
}

func bulkInsertWorker() {
	for range bufferTicker.C {
		if len(messageBuffer) == 0 {
			continue
		}

		log.Printf("Bulk inserting %d messages", len(messageBuffer))
		log.Printf("\nStarting bulk insert: %v", messageBuffer[0])
		if err := bulkInsertToDB(messageBuffer); err != nil {
			log.Printf("Error bulk inserting: %v", err)
		} else {
			messageBuffer = nil
			log.Println("Bulk insert completed successfully")
		}
	}
}

func bulkInsertToDB(messages []QAMessage) error {
	if len(messages) == 0 {
		return nil
	}

	ctx := context.Background()

	tx, err := database.DBPool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := repo.New(tx)

	for _, msg := range messages {
		chat, err := qtx.GetChatByDocID(ctx, msg.DocID)
		if err != nil {
			log.Printf("Chat not found for doc_id %s: %v", msg.DocID, err)
			continue
		}
		idUUID, err := uuid.Parse(msg.ID)
		if err != nil {
			log.Printf("Error parsing UUID %s: %v", msg.ID, err)
			return err
		}

		parsedTime, err := time.Parse(time.RFC3339, msg.Timestamp)
		if err != nil {
			log.Printf("Error parsing timestamp %s: %v", msg.Timestamp, err)
			return err
		}

		_, err = qtx.CreateQAHistory(ctx, repo.CreateQAHistoryParams{
			ID:        idUUID,
			ChatID:    chat.ID,
			Question:  msg.Question,
			Answer:    msg.Answer,
			Timestamp: parsedTime,
		})

		if err != nil {
			log.Printf("Error creating QA history: %v", err)
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}
