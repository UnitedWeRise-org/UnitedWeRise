# Qdrant Vector Database Setup Guide

## Prerequisites

1. **Docker Desktop** installed on your system
2. **Node.js packages** (will be installed automatically)

## Quick Setup

### 1. Start Qdrant with Docker

```bash
# From the backend directory
cd backend
docker compose -f docker-compose.qdrant.yml up -d
```

This will:
- Start Qdrant on `http://localhost:6333`
- Create persistent storage in a Docker volume
- Set up both HTTP and gRPC endpoints

### 2. Verify Qdrant is Running

```bash
curl http://localhost:6333/health
```

Should return: `{"title":"qdrant - vector search engine","version":"x.x.x"}`

### 3. Install Node.js Dependencies

```bash
npm install @qdrant/js-client-rest @huggingface/inference sentence-transformers-js
```

## Environment Variables

Add to your `.env` file:

```env
# Qdrant Vector Database
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Leave empty for local development

# AI Services
HUGGINGFACE_API_KEY="your-huggingface-api-key"
SENTENCE_TRANSFORMERS_MODEL="all-MiniLM-L6-v2"
QWEN3_API_URL="http://localhost:8000"
```

## Alternative: Qdrant Cloud

If you prefer cloud hosting:

1. Sign up at https://cloud.qdrant.io/
2. Create a cluster
3. Update environment variables:
   ```env
   QDRANT_URL="https://your-cluster-url.qdrant.cloud"
   QDRANT_API_KEY="your-api-key"
   ```

## Testing the Setup

Run the migration to create collections:

```bash
npm run migrate:qdrant
```

Or manually test:

```typescript
import { QdrantService } from './services/qdrantService';

// Test connection
const health = await QdrantService.healthCheck();
console.log('Qdrant status:', health);
```

## Performance Notes

- **Local Qdrant**: ~1000 vectors/second for similarity search
- **Memory usage**: ~1GB for 100K vectors (1536 dimensions)
- **Disk space**: ~500MB for 100K vectors with metadata
- **Startup time**: ~5-10 seconds for Docker container

## Troubleshooting

### Docker Issues
```bash
# Check if container is running
docker ps | grep qdrant

# View logs
docker logs qdrant-vector-db

# Restart container
docker compose -f docker-compose.qdrant.yml restart
```

### Connection Issues
```bash
# Test connection
curl -X GET http://localhost:6333/health

# Check port availability
netstat -an | grep 6333
```

### Storage Issues
```bash
# Check volume
docker volume ls | grep qdrant

# Remove and recreate (WARNING: deletes data)
docker volume rm backend_qdrant_storage
```