# OAuth Service

A serverless OAuth 2.0 authentication service built with Node.js, Express, and MongoDB.

## Features

- OAuth 2.0 token generation and validation
- Admin APIs for managing OAuth access records
- Swagger API documentation
- MongoDB integration
- Docker Compose setup for local development

## Development

### Prerequisites

- Node.js (v20.x recommended)
- npm
- Docker and Docker Compose
- MongoDB (optional if using Docker)

### Environment Setup

Copy the example environment file and modify as needed:

```bash
cp .env.example .env
```

### Running with Docker Compose

The easiest way to get started is using Docker Compose, which will set up both the OAuth service and MongoDB:

```bash
# Start the services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the services
docker-compose down

# Stop and remove volumes (will delete MongoDB data)
docker-compose down -v
```

The services will be available at:
- OAuth API: http://localhost:3000
- API Documentation: http://localhost:3000/docs
- Swagger UI: http://localhost:3000/api-docs
- MongoDB: localhost:27017

### Running Locally (without Docker)

```bash
# Install dependencies
npm install

# Install serverless globally (optional)
npm install -g serverless

# Start the service locally
sls offline start
```

## Deployment

### Deploy to AWS

```bash
# Deploy to development stage
sls deploy

# Deploy to production stage
sls deploy --stage production
```

## API Documentation

- API documentation is available at `/docs` endpoint
- Swagger UI is available at `/api-docs` endpoint

## Endpoints

### OAuth Endpoints

- `POST /oauth/token` - Generate OAuth token using client credentials
- `GET /validate-token` - Validate an existing OAuth token

### Admin API

The Admin API requires an API key for authentication. Set the `ADMIN_API_KEY` environment variable and include it in the `x-api-key` header for all admin requests.

- `POST /admin/oauth-access` - Create a new OAuth access record
- `GET /admin/oauth-access` - List OAuth access records with pagination and filtering
- `GET /admin/oauth-access/:id` - Get a single OAuth access record by ID or clientId
- `PUT /admin/oauth-access/:id` - Update an OAuth access record
- `DELETE /admin/oauth-access/:id` - Delete an OAuth access record

### Status Endpoint

- `GET /status` - Check the health and status of the service
  - Returns service status, version, timestamp, and environment information
  - Useful for health checks in containerized environments

## Testing

> **Important**: Always use Node.js v20 for development and testing

```bash
# Set Node.js version to v20 (required)
source ~/.nvm/nvm.sh && nvm use 20

# Run tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

The test suite includes:
- Unit tests for all API endpoints
- Mocked MongoDB connections for reliable testing
- Authentication testing for admin endpoints