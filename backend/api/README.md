# PDF Chater Backend API

A Go-based RESTful API for the PDF Chater application that allows users to manage and interact with PDF documents.

## Features

- User authentication (register, login) with JWT
- User profile management
- PDF document management and chat history
- Question-answer history tracking
- Database migrations system
- PostgreSQL integration with GORM

## Tech Stack

- **Language**: Go 1.24+
- **Web Framework**: Fiber
- **ORM**: GORM
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Environment**: dotenv for configuration

## Project Structure

```
api/
├── .env                  # Environment variables
├── go.mod                # Go module file with dependencies
├── main.go               # Main application entry point
├── controllers/          # HTTP request handlers
│   └── auth_controller.go # Authentication controller
├── database/             # Database connection and migrations
│   ├── database.go       # Database connection setup
│   └── migrations.go     # Database migration system
├── middleware/           # HTTP middleware
│   └── auth.go           # JWT authentication middleware
├── models/               # Database models
│   ├── user.go           # User model
│   ├── document.go       # Document model (Chat)
│   └── qahistory.go      # QA history model
├── routes/               # API routes
│   └── users.go          # User routes
└── README.md             # Project documentation
```

## Prerequisites

- Go 1.24 or higher
- PostgreSQL database
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pdf_chater/backend/api
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Set up environment variables by creating a `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
   JWT_SECRET="your_jwt_secret_key"
   PORT=8080
   ```

## Running the Application

Start the server:
```bash
go run main.go
```

The API will be available at `http://localhost:8080` (or the port specified in your .env file).

## API Endpoints

### Authentication

- **POST /register** - Register a new user
  
  Request:
  ```json
  {
    "name": "John Doe",
    "email": "user@example.com",
    "password": "password123"
  }
  ```
  
  Response:
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "uuid-string",
      "name": "John Doe",
      "email": "user@example.com",
      "created_at": "2025-06-06T16:00:00Z"
    },
    "token": "jwt-token-string"
  }
  ```

- **POST /login** - Login with existing credentials
  
  Request:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
  
  Response:
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "uuid-string",
      "name": "John Doe",
      "email": "user@example.com",
      "created_at": "2025-06-06T16:00:00Z"
    },
    "token": "jwt-token-string"
  }
  ```

### User

- **GET /profile** - Get user profile (requires authentication)
  
  Response:
  ```json
  {
    "user": {
      "id": "uuid-string",
      "name": "John Doe",
      "email": "user@example.com",
      "image": "profile-image-url",
      "created_at": "2025-06-06T16:00:00Z",
      "updated_at": "2025-06-06T16:00:00Z"
    }
  }
  ```

### Chat Management (To be implemented)

- **POST /chats** - Create a new chat session
  
  Request:
  ```json
  {
    "doc_id": "document-identifier",
    "doc_text": "Content of the PDF document"
  }
  ```
  
  Response:
  ```json
  {
    "id": "chat-uuid",
    "user_id": "user-uuid",
    "doc_id": "document-identifier",
    "created_at": "2025-06-06T16:00:00Z"
  }
  ```

- **GET /chats** - List all user's chat sessions
  
  Response:
  ```json
  {
    "chats": [
      {
        "id": "chat-uuid-1",
        "doc_id": "document-identifier-1",
        "created_at": "2025-06-06T16:00:00Z"
      },
      {
        "id": "chat-uuid-2",
        "doc_id": "document-identifier-2",
        "created_at": "2025-06-06T15:30:00Z"
      }
    ]
  }
  ```

- **GET /chats/:id** - Get a specific chat with its QA history
  
  Response:
  ```json
  {
    "id": "chat-uuid",
    "doc_id": "document-identifier",
    "doc_text": "Content of the PDF document",
    "created_at": "2025-06-06T16:00:00Z",
    "histories": [
      {
        "id": "qa-uuid-1",
        "question": "What is this document about?",
        "answer": "This document is about...",
        "timestamp": "2025-06-06T16:05:00Z"
      },
      {
        "id": "qa-uuid-2",
        "question": "When was it published?",
        "answer": "It was published on...",
        "timestamp": "2025-06-06T16:10:00Z"
      }
    ]
  }
  ```

- **POST /chats/:id/qa** - Add a new question-answer pair to a chat
  
  Request:
  ```json
  {
    "question": "What are the main points in this document?",
    "answer": "The main points in this document are..."
  }
  ```
  
  Response:
  ```json
  {
    "id": "qa-uuid",
    "chat_id": "chat-uuid",
    "question": "What are the main points in this document?",
    "answer": "The main points in this document are...",
    "timestamp": "2025-06-06T16:15:00Z"
  }
  ```

## Database Migrations

The application uses a custom migration system to manage database schema changes. Migrations are automatically applied when the application starts.

### Adding a New Migration

1. Define your model in the `models` package
2. Add a new migration to the `Migrations` slice in `database/migrations.go`:

```go
{
    Name:      "your_migration_name",
    Timestamp: time.Now(),
    Up: func() error {
        return DB.AutoMigrate(&models.YourModel{})
    },
    Down: func() error {
        return DB.Migrator().DropTable("your_table_name")
    },
},
```

## Development

### Adding New Features

1. Create or update models in the `models` package
2. Add necessary migrations in `database/migrations.go`
3. Create controllers in the `controllers` package
4. Add routes in the routes package

### Testing

Run tests:
```bash
go test ./...
```

## Deployment

1. Build the application:
   ```bash
   go build -o api-server
   ```

2. Run the compiled binary:
   ```bash
   ./api-server
   ```

## License

[Your License]

## Contributors

[Your Name/Team]
