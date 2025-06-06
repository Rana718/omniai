# PDF Chater Backend API

A Go-based RESTful API for the PDF Chater application that allows users to manage and interact with PDF documents.

## Features

- User authentication (register, login) with JWT
- User profile management
- PDF document management
- Database migrations system
- PostgreSQL integration with GORM

## Tech Stack

- **Language**: Go 1.24+
- **Web Framework**: Gin
- **ORM**: GORM
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Environment**: dotenv for configuration

## Project Structure

```
api/
├── .env                  # Environment variables
├── go.mod               # Go module file with dependencies
├── main.go              # Main application entry point
├── controllers/         # HTTP request handlers
│   └── auth_controller.go # Authentication controller
├── database/            # Database connection and migrations
│   ├── database.go      # Database connection setup
│   └── migrations.go    # Database migration system
├── middleware/          # HTTP middleware
│   └── auth.go          # JWT authentication middleware
├── models/              # Database models
│   ├── user.go          # User model
│   └── document.go      # Document model
└── README.md            # Project documentation
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

- **POST /api/register** - Register a new user
  ```json
  {
    "username": "example",
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- **POST /api/login** - Login with existing credentials
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### User

- **GET /api/profile** - Get user profile (requires authentication)

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
4. Add routes in `main.go`

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
