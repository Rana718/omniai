# PDF Chater AI Model Service

A sophisticated Python-based AI service for processing documents and answering questions using vector embeddings, language models, and advanced text processing techniques.

## Features

- **Multi-format Document Processing**: Support for PDF, TXT, DOCX, and image files
- **Advanced OCR**: Extract text from scanned documents and images with preprocessing for improved accuracy
- **Vector Embeddings**: Create and store semantic embeddings using state-of-the-art models
- **Semantic Search**: Retrieve relevant document sections based on question context
- **AI-powered Question Answering**: Generate accurate answers using retrieved context
- **Caching System**: Redis-based caching for improved performance
- **User Pattern Learning**: Adapt to user question patterns for better responses
- **Asynchronous Processing**: Handle multiple requests efficiently
- **Error Handling**: Graceful fallbacks for various failure scenarios

## Tech Stack

- **Language**: Python 3.10+
- **Web Framework**: FastAPI with async support
- **Vector Database**: Pinecone for efficient similarity search
- **Cache**: Redis for response and embedding caching
- **PDF Processing**: PyPDF2, pdf2image, pytesseract (OCR)
- **AI Components**: LangChain for orchestration, Google Generative AI for responses
- **Message Queue**: RabbitMQ for asynchronous processing
- **Communication**: gRPC for service-to-service communication
- **Containerization**: Docker

## Project Structure

```
Ai_model/
├── core/                  # Core AI functionality
│   ├── Pdf_Agent.py       # PDF processing and question answering
│   └── embeddings.py      # Vector embedding generation
├── routes/                # API routes
│   ├── pdf_routes.py      # PDF upload and question endpoints
│   └── health_routes.py   # Health check and monitoring endpoints
├── services/              # External service integrations
│   ├── grpc_func.py       # gRPC client for API service
│   └── rabbitmq.py        # RabbitMQ integration
├── utils/                 # Utility functions
│   ├── ChainManager.py    # LangChain management
│   ├── file_utils.py      # File handling utilities
│   ├── id_gen.py          # ID generation
│   ├── pinecone.py        # Pinecone vector database utilities
│   ├── redis_config.py    # Redis configuration
│   └── text_processing.py # Text preprocessing utilities
├── pb/                    # Protocol buffer definitions
├── storage/               # Temporary file storage
├── tests/                 # Unit and integration tests
├── .env                   # Environment variables
├── Dockerfile             # Docker configuration
├── main.py                # Application entry point
├── pyproject.toml         # Python dependencies
└── README.md              # Documentation
```

## Setup and Installation

### Prerequisites

- Python 3.10+
- Redis server
- Pinecone API key
- Google AI API key
- Docker (optional)

### Environment Variables

Create a `.env` file with the following variables:

```
GOOGLE_API_KEY1=your_google_api_key1
GOOGLE_API_KEY2=your_google_api_key2
GOOGLE_API_KEY3=your_google_api_key3
GOOGLE_API_KEY4=your_google_api_key4
GOOGLE_API_KEY5=your_google_api_key5
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_pinecone_index
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
GRPC_SERVER_ADDRESS=localhost:50051
PORT=8000
```

### Local Development

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -e .
   ```

3. Run the application:
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`.

### Docker Deployment

Build and run the Docker container:

```bash
docker build -t pdf-chater-ai-model .
docker run -p 8000:8000 --env-file .env pdf-chater-ai-model
```

## API Endpoints

### Document Upload

```
POST /pdf/upload
```

Parameters:
- `userid` (form): User ID
- `files` (form): Files to upload (PDF, TXT, DOCX, images)
- `doc_id` (form, optional): Document ID (generated if not provided)
- `doc_name` (form, optional): Document name

Response:
```json
{
  "message": "Documents processed and embeddings stored.",
  "doc_id": "generated_doc_id",
  "success": true,
  "total_words": 5000,
  "chunks_created": 25,
  "files_processed": 3
}
```

### Ask Question

```
POST /pdf/ask
```

Parameters:
- `userid` (form): User ID
- `doc_id` (form): Document ID
- `question` (form): Question to ask about the document

Response:
```json
{
  "answer": "Generated answer based on document content",
  "processing_time": 0.45
}
```

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "redis": "connected",
    "pinecone": "connected",
    "rabbitmq": "connected"
  }
}
```

## Document Processing Pipeline

1. **File Upload**: Files are received and saved temporarily
2. **Text Extraction**: 
   - PDF: PyPDF2 with OCR fallback using pytesseract
   - Images: OCR with preprocessing for better results
   - DOCX/TXT: Direct text extraction
3. **Text Preprocessing**: Cleaning, normalization, and formatting
4. **Chunking**: Text is split into manageable chunks with overlap
5. **Embedding Generation**: Vector embeddings are created for each chunk
6. **Vector Storage**: Embeddings are stored in Pinecone with metadata
7. **Notification**: API service is notified of successful processing

## Question Answering Pipeline

1. **Question Reception**: User question is received with document ID
2. **Cache Check**: Check if the question has been answered before
3. **Context Retrieval**: Relevant chunks are retrieved from Pinecone
4. **Answer Generation**: AI model generates an answer based on context
5. **Response Caching**: Answer is cached for future use
6. **History Tracking**: Question and answer are added to history
7. **User Pattern Learning**: System learns from user interaction patterns

## Performance Optimization

- **Multiple API Keys**: Rotation of Google API keys to avoid rate limits
- **Redis Caching**: Cache embeddings, document content, and responses
- **Asynchronous Processing**: FastAPI async endpoints for non-blocking operations
- **Concurrent Text Extraction**: ThreadPoolExecutor for parallel processing
- **Optimized OCR**: Image preprocessing for better text recognition
- **Fallback Mechanisms**: Multiple strategies for handling failures

## Integration with Other Services

This service integrates with:
- **API Service**: Through gRPC for chat history management
- **Frontend**: Through the API gateway for user interactions
- **Pinecone**: For vector storage and retrieval
- **Redis**: For caching and performance optimization
- **RabbitMQ**: For asynchronous task processing

## Monitoring and Logging

The service includes comprehensive logging for:
- Document processing steps
- Question answering performance
- Error tracking and handling
- Cache hit/miss statistics
- Vector search quality metrics

## License

[Your License]
