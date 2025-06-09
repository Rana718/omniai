# PDF Chater - AI-Powered Document Chat Platform

> **PDF Chater** transforms how you interact with documents by enabling natural language conversations with your PDFs. Upload documents and start asking questions immediately - no more manual searching through pages of content!

PDF Chater is a comprehensive full-stack application that allows users to upload PDF documents and chat with them using advanced AI. The application extracts text from PDFs (including scanned documents via OCR), creates vector embeddings, and uses AI to answer questions about the document content with high accuracy and context awareness.

## Project Overview

![PDF Chater Architecture](https://via.placeholder.com/800x400?text=PDF+Chater+Architecture)

### Key Features

- **User Authentication**: Secure login and registration system with JWT
- **PDF Upload & Processing**: Support for multiple file formats (PDF, TXT, DOCX, images) with OCR for scanned documents
- **Document Management**: Organize, search, and access your uploaded documents
- **AI-Powered Chat**: Ask natural language questions about your documents and get accurate, contextual answers
- **Chat History**: Track and review conversations for each document
- **Vector Search**: Efficient retrieval of relevant document sections using Pinecone vector database
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Performance Optimization**: Redis caching and optimized processing for fast responses

## Project Structure

The project follows a modern microservices architecture with the following components:

- [**Frontend**](./frontend/README.md): Next.js web application with TypeScript and Tailwind CSS
- [**API Service**](./api/README.md): Go-based RESTful API with PostgreSQL database
- [**AI Model Service**](./Ai_model/README.md): Python FastAPI service for document processing and AI interactions
- [**Nginx Gateway**](./nginx/README.md): API gateway for routing traffic and rate limiting

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pdf_chater.git
   cd pdf_chater
   ```

2. Set up environment variables:
   - Copy `.env.example` files to `.env` in each service directory
   - Update the variables with your configuration (API keys, database credentials, etc.)

3. Start the application:
   ```bash
   docker-compose up
   ```

4. Access the application:
   - Frontend: http://localhost:4050
   - API Documentation: http://localhost:4050/api/docs
   - AI Model Documentation: http://localhost:4050/ai/docs

## Development Setup

For development, you can run each service individually:

### Frontend

```bash
cd frontend
npm install
npm run dev
```

See [Frontend README](./frontend/README.md) for more details.

### API Service

```bash
cd api
go mod download
go run main.go
```

See [API README](./api/README.md) for more details.

### AI Model Service

```bash
cd Ai_model
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
python main.py
```

See [AI Model README](./Ai_model/README.md) for more details.

## Architecture

### Data Flow

1. User uploads documents through the frontend interface
2. Files are sent to the AI Model service for processing
3. Text is extracted (with OCR if needed), chunked, and stored as vector embeddings in Pinecone
4. When users ask questions, the relevant context is retrieved from Pinecone using semantic search
5. The AI model generates accurate answers based on the retrieved context
6. Chat history is stored in the database through the API service
7. Results are cached in Redis for improved performance on repeated queries

### Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Zustand
- **API Service**: Go, Fiber, GORM, PostgreSQL, JWT
- **AI Model**: Python, FastAPI, LangChain, Pinecone, Redis, PyTesseract (OCR)
- **Infrastructure**: Docker, Nginx, RabbitMQ, gRPC
- **DevOps**: Docker Compose, environment-based configuration


## Documentation

- [Frontend Documentation](./frontend/README.md)
- [API Documentation](./api/README.md)
- [AI Model Documentation](./Ai_model/README.md)
- [Nginx Gateway Documentation](./nginx/README.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Your License]

## Acknowledgments

- LangChain for providing the framework for AI interactions
- Pinecone for vector database capabilities
- All contributors who have helped shape this project
