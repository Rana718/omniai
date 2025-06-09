# PDF Chater Nginx Gateway

A high-performance Nginx configuration for routing traffic between the different services of the PDF Chater application, with advanced rate limiting, security features, and error handling.

## Overview

This Nginx setup serves as an API gateway for the PDF Chater application, providing:

- **Traffic Routing**: Direct requests to appropriate microservices
- **Rate Limiting**: Prevent abuse and ensure fair resource allocation
- **Error Handling**: Consistent error responses across services
- **Logging**: Detailed access and error logging
- **Security**: Basic protection against common web vulnerabilities

## Service Routing

The gateway routes traffic to the following services:

- **API Service (Go)**: User authentication, document management, and chat history
- **AI Model Service (Python/FastAPI)**: Document processing and question answering

## Configuration Files

- `nginx.conf`: Main Nginx configuration with global settings
- `conf.d/gateway.conf`: Service-specific routing and rate limiting rules

## Rate Limiting Configuration

The gateway implements different rate limits for various endpoints:

- **General Endpoints**: 10 requests per second with burst of 5
- **API Endpoints**: 15 requests per second with burst of 10
- **AI Endpoints**: 3 requests per second with burst of 5 (resource-intensive operations)
- **Authentication Endpoints**: 5 requests per second with burst of 3 (security-sensitive)

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
- MIME types and compression settings
- Logging formats and locations
- Rate limiting zones
- Connection limiting
- Performance optimizations

### Gateway Configuration

The gateway configuration in `conf.d/gateway.conf` handles:

- Endpoint routing rules
- Rate limit application
- Request/response headers
- Timeout settings
- Error page definitions

## Logging

Nginx logs are stored in the `logs/nginx` directory and include:

- `access.log`: Standard access logs
- `error.log`: Error logs
- `gateway_access.log`: Gateway-specific access logs
- `gateway_error.log`: Gateway-specific error logs
- `rate_limit.log`: Rate limiting events
- `auth_rate_limit.log`: Authentication rate limiting events
- `api_rate_limit.log`: API rate limiting events
- `ai_rate_limit.log`: AI service rate limiting events

## Security Features

- **Rate Limiting**: Prevents brute force and DoS attacks
- **Connection Limiting**: Maximum 20 connections per client IP
- **Request Timeouts**: Prevents slow client attacks
- **Error Handling**: No sensitive information in error responses
- **Headers**: Security-related headers for API responses

## Performance Optimizations

- **Gzip Compression**: Reduces bandwidth usage
- **Keepalive Connections**: Reduces connection overhead
- **Buffer Tuning**: Optimized for typical API traffic
- **Worker Process Configuration**: Auto-scaled based on CPU cores

## Customization

To modify the routing or add new services:

1. Edit the configuration files in the `nginx/` directory
2. Restart the Nginx container:
   ```bash
   docker-compose restart nginx-gateway
   ```

### Adding a New Service

To add a new service to the gateway:

1. Add a new location block to `conf.d/gateway.conf`:
   ```nginx
   location /new-service/ {
       limit_req zone=general burst=5 nodelay;
       
       rewrite ^/new-service/(.*)$ /$1 break;
       
       proxy_pass http://new-service:port;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

2. Add the service to the Docker network in `docker-compose.yml`

## Monitoring

The gateway includes a status endpoint for monitoring:

```
GET /nginx_status
```

This endpoint is restricted to internal network access and provides information about:
- Active connections
- Request statistics
- Connection states

## Health Check

A simple health check endpoint is available:

```
GET /health
```

This returns a 200 OK response with "healthy" text, useful for container orchestration systems.

## Production Considerations

For production deployment, consider:

- Adding SSL/TLS configuration
- Implementing more advanced security measures
- Setting up log rotation
- Configuring a CDN for static assets
- Implementing more detailed monitoring

## License

[Your License]
