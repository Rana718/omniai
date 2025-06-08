# PDF Chater

PDF Chater is a full-stack application that allows users to upload PDF documents and chat with them using AI. The application extracts text from PDFs, creates vector embeddings, and uses AI to answer questions about the document content.

## Project Overview

![PDF Chater Architecture](https://via.placeholder.com/800x400?text=PDF+Chater+Architecture)

### Key Features

- **User Authentication**: Secure login and registration system
- **PDF Upload**: Support for multiple PDF files with OCR for scanned documents
- **Document Management**: Organize and access your uploaded documents
- **AI-Powered Chat**: Ask questions about your documents and get accurate answers
- **Chat History**: Track conversations for each document
- **Vector Search**: Efficient retrieval of relevant document sections
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

The project follows a microservices architecture with the following components:

- [**Frontend**](./frontend/README.md): Next.js web application
- [**API Service**](./api/README.md): Go-based RESTful API
- [**AI Model Service**](./Ai_model/README.md): Python FastAPI service for PDF processing
- [**Nginx Gateway**](./nginx/README.md): API gateway for routing traffic

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
   - Update the variables with your configuration

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

1. User uploads PDF documents through the frontend
2. Files are sent to the AI Model service for processing
3. Text is extracted, chunked, and stored as vector embeddings in Pinecone
4. When users ask questions, the relevant context is retrieved from Pinecone
5. The AI generates answers based on the retrieved context
6. Chat history is stored in the database through the API service

### Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **API Service**: Go, Fiber, GORM, PostgreSQL
- **AI Model**: Python, FastAPI, LangChain, Pinecone, Redis
- **Infrastructure**: Docker, Nginx, gRPC

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

- List any libraries, tools, or resources that were particularly helpful
- Credit any inspiration or reference projects
