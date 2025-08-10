# Qdrant Setup Instructions

## Option 1: Local Docker Setup (Recommended)

**Prerequisites:** Docker Desktop installed

1. **Start Qdrant:**
   ```bash
   cd backend
   docker compose -f docker-compose.qdrant.yml up -d
   ```

2. **Verify it's running:**
   ```bash
   curl http://localhost:6333/health
   # Should return: {"title":"qdrant - vector search engine","version":"x.x.x"}
   ```

3. **Check Docker status:**
   ```bash
   docker ps | grep qdrant
   ```

## Option 2: Qdrant Cloud (Alternative)

If Docker isn't available, you can use Qdrant Cloud:

1. **Sign up:** https://cloud.qdrant.io/
2. **Create a cluster** (free tier available)
3. **Update your .env file:**
   ```env
   QDRANT_URL="https://your-cluster-url.qdrant.io"
   QDRANT_API_KEY="your-api-key"
   ```

## Option 3: Skip Qdrant for Now

The system will work with PostgreSQL arrays for vector storage:

1. **In your .env file, comment out:**
   ```env
   # QDRANT_URL="http://localhost:6333"
   # QDRANT_API_KEY=""
   ```

2. **The system will automatically fall back to PostgreSQL**

## Environment Variables

Add these to your `.env` file:

```env
# Qdrant Vector Database
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Leave empty for local development

# HuggingFace API (for Sentence Transformers)
HUGGINGFACE_API_KEY="your-huggingface-api-key"

# Qwen3 API (for complex reasoning)
QWEN3_API_URL="http://localhost:8000"
QWEN3_API_KEY="your-qwen3-api-key"
```

## Getting HuggingFace API Key

1. **Sign up:** https://huggingface.co/join
2. **Get API key:** https://huggingface.co/settings/tokens
3. **Create a new token** with "Read" permission
4. **Add to .env file**

## Next Steps After Setup

Once Qdrant is running (or you've chosen an alternative), run:

```bash
# Test the connection
node -e "
const { QdrantService } = require('./dist/services/qdrantService.js');
QdrantService.healthCheck().then(console.log).catch(console.error);
"
```

Then proceed with enabling the AI services in the code.