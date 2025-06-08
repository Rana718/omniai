# PDF Chater Nginx Gateway

Nginx configuration for routing traffic between the different services of the PDF Chater application.

## Overview

This Nginx setup serves as an API gateway for the PDF Chater application, routing traffic to the appropriate microservices:

- Frontend (Next.js)
- API Service (Go)
- AI Model Service (Python/FastAPI)

## Configuration Files

- `nginx.conf`: Main Nginx configuration file
- `conf.d/`: Directory containing service-specific configurations

## Docker Configuration

The Nginx service is containerized using Docker with the following configuration:

- Exposes port 80 internally, mapped to port 4050 on the host
- Mounts configuration files from the host
- Logs to the `/logs/nginx` directory
- Connects to the `pdf-chater-network` Docker network

## Setup

### Prerequisites

- Docker
- Docker Compose

### Running with Docker Compose

The Nginx gateway is configured in the main `docker-compose.yml` file and can be started with:

```bash
docker-compose up nginx-gateway
```

Or as part of the entire application:

```bash
docker-compose up
```

## Configuration Details

### Main Nginx Configuration

The main configuration in `nginx.conf` sets up:

- Worker processes and connections
- MIME types
- Logging formats
- HTTP settings
- Includes for service-specific configurations

### Service Routing

The service-specific configurations in `conf.d/` handle:

- Routing rules for each service
- Load balancing (if applicable)
- SSL/TLS settings (if configured)
- Headers and proxy settings

## Customization

To modify the routing or add new services:

1. Edit or add configuration files in the `conf.d/` directory
2. Restart the Nginx container:
   ```bash
   docker-compose restart nginx-gateway
   ```

## Logs

Nginx logs are stored in the `logs/nginx` directory and include:

- Access logs
- Error logs

## Security Considerations

- The Nginx configuration should be reviewed for security best practices
- Consider adding rate limiting for API endpoints
- Implement proper SSL/TLS for production deployments
