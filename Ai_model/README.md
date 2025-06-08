# PDF Chater AI Model Service

A Python-based AI service for processing PDF documents and answering questions using vector embeddings and language models.

## Features

- PDF text extraction with OCR fallback for scanned documents
- Vector embeddings creation and storage using Pinecone
- Question answering using context retrieval and language models
- Redis caching for improved performance
- gRPC integration with the API service

## Tech Stack

- **Language**: Python 3.10+
- **Web Framework**: FastAPI
- **Vector Database**: Pinecone
- **Cache**: Redis
- **PDF Processing**: PyPDF2, pdf2image, pytesseract
- **AI Components**: LangChain
- **Containerization**: Docker

## Project Structure

```
Ai_model/
├── core/                  # Core AI functionality
│   └── Pdf_Agent.py       # PDF processing and question answering
├── routes/                # API routes
│   └── pdf_routes.py      # PDF upload and question endpoints
├── services/              # External service integrations
│   └── grpc_func.py       # gRPC client for API service
├── utils/                 # Utility functions
│   ├── ChainManager.py    # LangChain management
│   ├── file_utils.py      # File handling utilities
│   ├── id_gen.py          # ID generation
│   ├── pinecone.py        # Pinecone vector database utilities
│   └── redis_config.py    # Redis configuration
├── pb/                    # Protocol buffer definitions
├── storage/               # Temporary file storage
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
- Docker (optional)

### Environment Variables

Create a `.env` file with the following variables:

```
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
OPENAI_API_KEY=your_openai_api_key
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

### PDF Upload

```
POST /pdf/upload
```

Parameters:
- `userid` (form): User ID
- `files` (form): PDF files to upload
- `doc_id` (form, optional): Document ID
- `doc_name` (form, optional): Document name

Response:
```json
{
  "message": "PDFs processed and embeddings stored.",
  "doc_id": "generated_doc_id"
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
  "answer": "Generated answer based on document content"
}
```

## Integration with Other Services

This service integrates with:
- **API Service**: Through gRPC for chat history management
- **Frontend**: Through the API gateway for user interactions

## License

[Your License]
