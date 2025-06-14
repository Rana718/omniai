# PDF Chater Backend API

A high-performance Go-based RESTful API for the PDF Chater application that handles user authentication, document management, and chat history tracking.

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **User Profile Management**: Create and update user profiles
- **Document Management**: Store and retrieve document metadata
- **Chat History**: Track and manage question-answer history for each document
- **Database Integration**: PostgreSQL with GORM for reliable data storage
- **Middleware**: Authentication, logging, and error handling
- **gRPC Server**: Communication with AI service for document processing
- **API Documentation**: Auto-generated Swagger documentation

## Tech Stack

- **Language**: Go 1.24+
- **Web Framework**: Fiber v2 (high-performance Express-inspired web framework)
- **ORM**: GORM with PostgreSQL driver
- **Authentication**: JWT (JSON Web Tokens)
- **Message Queue**: RabbitMQ for asynchronous processing
- **Cache**: Redis for improved performance
- **Documentation**: Swagger/OpenAPI
- **Environment**: dotenv for configuration

## Project Structure

```
api/
├── .env                  # Environment variables
├── go.mod                # Go module file with dependencies
├── go.sum                # Go dependencies checksum
├── main.go               # Main application entry point
├── controllers/          # HTTP request handlers
│   ├── auth_controller.go # Authentication controller
│   ├── user_controller.go # User management controller
│   ├── doc_controller.go  # Document management controller
│   └── chat_controller.go # Chat history controller
├── database/             # Database connection and migrations
│   ├── database.go       # Database connection setup
│   └── migrations.go     # Database migration system
├── middleware/           # HTTP middleware
│   ├── auth.go           # JWT authentication middleware
│   ├── logger.go         # Request logging middleware
│   └── error_handler.go  # Centralized error handling
├── models/               # Database models
│   ├── user.go           # User model
│   ├── document.go       # Document model
│   └── chat_history.go   # Chat history model
├── routes/               # API routes
│   ├── auth_routes.go    # Authentication routes
│   ├── user_routes.go    # User management routes
│   ├── doc_routes.go     # Document management routes
│   └── chat_routes.go    # Chat history routes
├── services/             # Business logic
│   ├── auth_service.go   # Authentication service
│   ├── user_service.go   # User management service
│   └── chat_service.go   # Chat history service
├── utils/                # Utility functions
│   ├── jwt.go            # JWT token utilities
│   ├── password.go       # Password hashing utilities
│   └── validator.go      # Request validation utilities
├── grpc/                 # gRPC server implementation
│   ├── server.go         # gRPC server setup
│   └── proto/            # Protocol buffer definitions
├── docs/                 # API documentation
│   └── swagger.json      # Swagger/OpenAPI specification
└── README.md             # Project documentation
```

## Prerequisites

- Go 1.24 or higher
- PostgreSQL database
- Redis (optional, for caching)
- RabbitMQ (optional, for async processing)
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pdf_chater/api
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
   REDIS_URL="redis://localhost:6379"
   RABBITMQ_URL="amqp://guest:guest@localhost:5672/"
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

### User Management

- **GET /user/profile** - Get user profile (requires authentication)
  
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

- **PUT /user/profile** - Update user profile (requires authentication)
  
  Request:
  ```json
  {
    "name": "John Updated",
    "image": "new-profile-image-url"
  }
  ```
  
  Response:
  ```json
  {
    "message": "Profile updated successfully",
    "user": {
      "id": "uuid-string",
      "name": "John Updated",
      "email": "user@example.com",
      "image": "new-profile-image-url",
      "created_at": "2025-06-06T16:00:00Z",
      "updated_at": "2025-06-09T10:30:00Z"
    }
  }
  ```

### Document Management

- **GET /documents** - List all user's documents (requires authentication)
  
  Response:
  ```json
  {
    "documents": [
      {
        "id": "doc-uuid-1",
        "name": "Business Report 2025",
        "created_at": "2025-06-06T16:00:00Z",
        "last_accessed": "2025-06-09T10:00:00Z"
      },
      {
        "id": "doc-uuid-2",
        "name": "Technical Specification",
        "created_at": "2025-06-05T14:30:00Z",
        "last_accessed": "2025-06-08T09:15:00Z"
      }
    ]
  }
  ```

- **GET /documents/:id** - Get document details (requires authentication)
  
  Response:
  ```json
  {
    "id": "doc-uuid-1",
    "name": "Business Report 2025",
    "created_at": "2025-06-06T16:00:00Z",
    "last_accessed": "2025-06-09T10:00:00Z",
    "chat_count": 5
  }
  ```

### Chat Management

- **GET /chats/:doc_id** - Get chat history for a document (requires authentication)
  
  Response:
  ```json
  {
    "chat_history": [
      {
        "id": "qa-uuid-1",
        "question": "What is this document about?",
        "answer": "This document is about the business projections for 2025...",
        "timestamp": "2025-06-06T16:05:00Z"
      },
      {
        "id": "qa-uuid-2",
        "question": "When was it published?",
        "answer": "It was published on June 1, 2025.",
        "timestamp": "2025-06-06T16:10:00Z"
      }
    ]
  }
  ```

- **POST /chats/:doc_id** - Add a new question-answer pair to chat history
  
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
    "id": "qa-uuid-3",
    "doc_id": "doc-uuid-1",
    "question": "What are the main points in this document?",
    "answer": "The main points in this document are...",
    "timestamp": "2025-06-09T11:15:00Z"
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
4. Add routes in the `routes` package
5. Update API documentation

### Testing

Run tests:
```bash
go test ./...
```

Generate test coverage report:
```bash
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Performance Considerations

- Connection pooling for database access
- Redis caching for frequently accessed data
- Proper indexing on database tables
- Request rate limiting
- Efficient JSON serialization/deserialization

## Deployment

### Building for Production

```bash
go build -o api-server
```

### Docker Deployment

The API service is configured to be built and run as part of the main Docker Compose setup. See the root README.md for details.

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens with appropriate expiration
- Input validation on all endpoints
- CORS configuration for frontend access
- Rate limiting to prevent abuse
- SQL injection protection via GORM

## License

[Your License]

## Database Migrations

This project includes a custom Go-based migration system for managing database schema changes.

### Quick Start with Migrations

```bash
# Run all pending migrations
./migrate.sh up

# Check migration status
./migrate.sh status

# Rollback 1 migration
./migrate.sh down

# Rollback 3 migrations
./migrate.sh down 3

# Reset database (WARNING: drops all data)
./migrate.sh reset
```

### Using Make Commands

```bash
# Run migrations
make migrate-up

# Check status
make migrate-status

# Rollback migrations
make migrate-down
make migrate-down-steps STEPS=3

# Reset database
make migrate-reset
```

### Docker Migrations

```bash
# Run migrations in Docker
docker-compose -f docker-compose.migrate.yml up migrate

# Check migration status
docker-compose -f docker-compose.migrate.yml up migrate-status

# Rollback migrations
docker-compose -f docker-compose.migrate.yml up migrate-down
```

### Migration Features

- **Transaction Safety**: Each migration runs in a transaction
- **Version Tracking**: Keeps track of applied migrations
- **Rollback Support**: All migrations include rollback SQL
- **Status Checking**: View current migration status
- **Reset Functionality**: Drop all tables and start fresh

For detailed migration documentation, see [cmd/migrate/README.md](cmd/migrate/README.md).

### Database Schema

The migration system manages these tables:

- **users**: User accounts with authentication
- **chats**: PDF document chat sessions
- **qa_histories**: Question-answer pairs for each chat
- **schema_migrations**: Migration version tracking

### Adding New Migrations

To add a new migration, edit `cmd/migrate/main.go` and add to the `migrations` slice:

```go
{
    Version: 5,
    Name:    "add_user_preferences",
    Up: `
        ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
        CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN (preferences);
    `,
    Down: `
        DROP INDEX IF EXISTS idx_users_preferences;
        ALTER TABLE users DROP COLUMN IF EXISTS preferences;
    `,
},
```
