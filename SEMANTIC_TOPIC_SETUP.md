# Semantic Topic Discovery & Navigation Setup Guide

> **📋 Cross-References**: [AZURE_VECTOR_INTEGRATION.md](./AZURE_VECTOR_INTEGRATION.md) | [PROJECT_SUMMARY_UPDATED.md](./PROJECT_SUMMARY_UPDATED.md) | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

## Overview

This system implements sophisticated semantic topic discovery using vector similarity clustering and AI summarization for the UnitedWeRise civic social media platform. It groups related political discussions into topics and provides AI-generated summaries with prevailing positions and leading critiques.

## ⚠️ IMPORTANT: Azure-First Production Strategy

**For Production Deployment**: Use [AZURE_VECTOR_INTEGRATION.md](./AZURE_VECTOR_INTEGRATION.md) - integrates with existing Azure infrastructure without dual codebase maintenance.

**For Local Development Only**: Continue reading this guide for local testing setup.

## 🛠️ Installation & Setup

### Prerequisites

- Node.js and npm installed
- Docker Desktop (recommended for Qdrant)
- Git

### Step 1: Install Qdrant Vector Database

**Option A: Docker (Recommended)**
```bash
# Pull and run Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Verify it's running
curl http://localhost:6333/health
# Should return: {"status":"ok"}
```

**Option B: Direct Installation**
```bash
# Windows: Download from GitHub releases
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-pc-windows-msvc.zip -o qdrant.zip
# Extract and run qdrant.exe

# Linux/Mac: 
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-unknown-linux-gnu.tar.gz | tar xz
./qdrant
```

### Step 2: Set Up AI Model (Choose One)

**Option A: Local Ollama (Free, Recommended)**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download Qwen model (7B parameters, ~4GB)
ollama pull qwen2.5:7b

# Start Ollama server
ollama serve

# Test
curl http://localhost:11434/api/version
```

**Option B: OpenAI API**
1. Get API key from https://platform.openai.com/
2. Update .env with OpenAI configuration

### Step 3: Choose Embedding Method

**Option A: Free Hugging Face API (Recommended for better accuracy)**
1. Create free account at https://huggingface.co/
2. Go to Settings → Access Tokens
3. Create new token with "Read" permission
4. Copy token (starts with `hf_`)

**Option B: 100% Local (No API keys, completely free)**
- Skip getting API key
- System will automatically use local semantic embedding
- Slightly lower accuracy but works offline

### Step 4: Configure Environment Variables

Update `backend/.env`:
```env
# Option A: Hugging Face API (better accuracy, 10k requests/month free)
HUGGINGFACE_API_KEY="hf_your_actual_token_here"

# Option B: Local only (no API key needed)
# Just leave HUGGINGFACE_API_KEY empty or remove the line

# Required: Qdrant vector database
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""

# Option A: Local Ollama (recommended)
QWEN3_API_URL="http://localhost:11434/v1"
QWEN3_API_KEY="ollama"
QWEN3_MODEL="qwen2.5:7b"

# Option B: OpenAI (alternative)
# QWEN3_API_URL="https://api.openai.com/v1"
# QWEN3_API_KEY="your_openai_api_key"
# QWEN3_MODEL="gpt-3.5-turbo"
```

### Step 5: Restart Backend Server

```bash
cd backend
npm run build
npm start
```

## 🧪 Testing the System

### 1. Verify Services
```bash
# Test Qdrant
curl http://localhost:6333/health

# Test Ollama
curl http://localhost:11434/api/version

# Test backend health
curl http://localhost:3001/health
```

### 2. Create Test Posts
```bash
# Get auth token first (register/login)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123!","firstName":"Test","lastName":"User","hcaptchaToken":"test"}'

# Create political posts with different viewpoints
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"Universal healthcare is essential for economic prosperity and human dignity","isPolitical":true}'

curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"Free market healthcare drives innovation and efficiency better than government programs","isPolitical":true}'
```

### 3. Test Topic Discovery
```bash
# Discover trending topics
curl http://localhost:3001/api/topic-navigation/trending

# Expected response:
{
  "success": true,
  "topics": [
    {
      "id": "topic_123",
      "title": "Healthcare Policy Discussion",
      "prevailingPosition": "Support for universal healthcare as economic necessity",
      "leadingCritique": "Concerns about government efficiency vs market solutions",
      "postCount": 5,
      "discoveredAt": "2025-08-12T23:30:00.000Z"
    }
  ]
}
```

### 4. Test Topic Navigation
```bash
# Enter topic mode
curl -X POST http://localhost:3001/api/topic-navigation/enter/topic_123 \
  -H "Content-Type: application/json"

# Get topic posts
curl http://localhost:3001/api/topic-navigation/topic_123/posts

# Exit topic mode
curl -X POST http://localhost:3001/api/topic-navigation/exit \
  -H "Content-Type: application/json"
```

## 🎯 How It Works

### 1. Post Creation Flow
```
User creates post → Generate embedding → Store in Qdrant → Analyze for feedback → Save to database
```

### 2. Topic Discovery Flow
```
Retrieve recent posts → Cluster by vector similarity → Generate AI summaries → Create topic cards
```

### 3. Topic Navigation Flow
```
User clicks topic → Enter topic mode → Filter posts by similarity → Display topic-specific feed
```

### 4. AI Summarization Process
```
Cluster similar posts → Extract representative posts → Qwen3 analysis → Generate:
- Prevailing position (majority viewpoint)
- Leading critique (main opposition argument)
- Topic title and summary
```

## 🔧 Architecture

### Backend Services
- `TopicDiscoveryService` - Vector clustering and topic generation
- `SemanticSearchService` - Universal semantic search patterns
- `QdrantService` - Vector database operations
- `QwenService` - AI analysis and summarization
- `EmbeddingService` - Text-to-vector conversion

### API Endpoints
- `GET /api/topic-navigation/trending` - Discover topics
- `POST /api/topic-navigation/enter/:id` - Enter topic
- `POST /api/topic-navigation/exit` - Exit topic
- `GET /api/topic-navigation/:id/posts` - Get topic posts

### Frontend Integration
- Enhanced `TrendingSystemIntegration` with semantic topics
- Topic cards with AI-generated summaries
- Smooth topic mode transitions
- Breadcrumb navigation

## 🚨 Troubleshooting

### Common Issues

1. **"No topics discovered"**
   - Ensure Qdrant is running on port 6333
   - Check that posts have embeddings (HUGGINGFACE_API_KEY set)
   - Verify at least 3-5 posts exist with similar content

2. **"Embedding generation failed"**
   - Verify HUGGINGFACE_API_KEY is valid
   - Check internet connection for Hugging Face API
   - System falls back to alternative embedding method

3. **"AI summarization failed"**
   - Ensure Ollama is running (if using local setup)
   - Verify QWEN3_API_URL is accessible
   - Check model is downloaded: `ollama list`

4. **"Qdrant connection refused"**
   - Start Qdrant: `docker run -p 6333:6333 qdrant/qdrant`
   - Check port not in use: `netstat -an | grep 6333`
   - Verify Docker is running

### Debug Commands
```bash
# Check service status
curl http://localhost:6333/health        # Qdrant
curl http://localhost:11434/api/version  # Ollama
curl http://localhost:3001/health        # Backend

# Check logs
docker logs $(docker ps | grep qdrant | awk '{print $1}')
tail -f backend/logs/app.log

# Test embeddings manually
curl -X POST http://localhost:3001/api/debug/embedding \
  -H "Content-Type: application/json" \
  -d '{"text":"Test political content"}'
```

## 📊 Performance Considerations

### Resource Usage
- **Qdrant**: ~100MB RAM, minimal CPU
- **Ollama + Qwen2.5:7B**: ~8GB RAM, moderate CPU during inference
- **Embeddings**: ~50ms per post, cached in database
- **Topic Discovery**: Runs every few minutes, lightweight

### Scaling
- **Local Development**: Current setup handles thousands of posts
- **Production**: Consider Qdrant Cloud or dedicated server for Ollama
- **Optimization**: Enable embedding caching, batch processing

## 🔮 Advanced Features

### Custom Topic Categories
Modify `TopicDiscoveryService.discoverTopics()` to add domain-specific clustering:
```typescript
// Add custom filters for election topics, local issues, etc.
const electionTopics = await this.clusterByKeywords(['election', 'voting', 'candidate']);
const localTopics = await this.clusterByGeography(userLocation);
```

### Enhanced AI Prompts
Customize summarization in `TopicDiscoveryService.generateTopicSummary()`:
```typescript
const prompt = `Analyze these ${posts.length} posts about ${topic}:
Focus on: policy positions, evidence cited, emotional tone
Generate: balanced summary, key disagreements, compromise potential`;
```

### Real-time Updates
Add WebSocket support for live topic updates:
```typescript
// Emit topic updates to connected clients
io.emit('topicDiscovered', newTopic);
io.emit('topicTrending', updatedTopic);
```

## 📝 Development Notes

- All new topic-related code follows existing patterns
- Graceful fallbacks ensure system works without AI services
- Frontend integration enhances existing trending system
- Vector clustering is optimized for political content
- AI summaries designed for balanced political discourse

## 🎉 Success Metrics

System is working correctly when:
- ✅ Similar posts cluster into coherent topics
- ✅ AI summaries are balanced and informative  
- ✅ Users can navigate seamlessly between topics
- ✅ Topic discovery finds 3-5 topics from 20+ posts
- ✅ No errors in backend logs
- ✅ Sub-second response times for topic operations