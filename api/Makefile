.PHONY: run build test sqlc proto clean migrate-up migrate-down migrate-status migrate-reset migrate-down-steps help

run:
	go run main.go

build:
	go build -o api-server main.go


sqlc:
	sqlc generate

proto:
	protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative proto/service.proto

clean:
	rm -f api-server

# Migration commands
migrate-up:
	go run cmd/main.go migrate up

migrate-down:
	go run cmd/main.go migrate down

migrate-status:
	go run cmd/main.go migrate status

migrate-reset:
	go run cmd/main.go migrate reset

migrate-down-steps:
	go run cmd/main.go migrate down --steps=$(STEPS)

# Help
help:
	@echo "Available commands:"
	@echo "  make run              - Run the application"
	@echo "  make build            - Build the application"
	@echo "  make test             - Run tests"
	@echo "  make sqlc             - Generate SQLC code"
	@echo "  make proto            - Generate protobuf code"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make migrate-up       - Run all pending migrations"
	@echo "  make migrate-down     - Rollback 1 migration"
	@echo "  make migrate-down-steps STEPS=n - Rollback n migrations"
	@echo "  make migrate-status   - Show migration status"
	@echo "  make migrate-reset    - Reset database (drops all data)"
	@echo "  make help             - Show this help"
