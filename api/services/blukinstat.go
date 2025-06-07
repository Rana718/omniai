package services

import (
    "apiserver/database"
    "apiserver/models"
    "encoding/json"
    "log"
    "time"

    "github.com/streadway/amqp"
    "gorm.io/gorm"
)

type QAMessage struct {
    DocID    string `json:"doc_id"`
    Question string `json:"question"`
    Answer   string `json:"answer"`
	ID        string `json:"id"`       
    Timestamp string `json:"timestamp"`
}

var messageBuffer []QAMessage
var bufferTicker *time.Ticker

func InitRabbitMQConsumer() {
    conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
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
        "pdf_caht", 
        true,       // durable
        false,      // delete when unused
        false,      // exclusive
        false,      // no-wait
        nil,        // arguments
    )
    if err != nil {
        log.Fatalf("Failed to declare a queue: %v", err)
    }

    msgs, err := ch.Consume(
        q.Name, 
        "",     // consumer
        false,  // auto-ack
        false,  // exclusive
        false,  // no-local
        false,  // no-wait
        nil,    // args
    )
    if err != nil {
        log.Fatalf("Failed to register a consumer: %v", err)
    }

    bufferTicker = time.NewTicker(5 * time.Minute)
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

    return database.DB.Transaction(func(tx *gorm.DB) error {
        var qaHistories []models.QAHistory
        
        for _, msg := range messages {
            var chat models.Chat
            if err := tx.Where("doc_id = ?", msg.DocID).First(&chat).Error; err != nil {
                log.Printf("Chat not found for doc_id %s: %v", msg.DocID, err)
                continue
            }

            timestamp, err := time.Parse(time.RFC3339, msg.Timestamp)
            if err != nil {
                log.Printf("Error parsing timestamp %s: %v", msg.Timestamp, err)
                timestamp = time.Now()
            }

            qaHistory := models.QAHistory{
                ID:        msg.ID,      
                ChatID:    chat.ID,
                Question:  msg.Question,
                Answer:    msg.Answer,
                Timestamp: timestamp,   
            }
            
            qaHistories = append(qaHistories, qaHistory)
        }
        
        if len(qaHistories) > 0 {
            if err := tx.CreateInBatches(qaHistories, 100).Error; err != nil {
                log.Printf("Error batch creating QA histories: %v", err)
                return err
            }
        }
        
        return nil
    })
}