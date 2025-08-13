# Azure Vector Integration for Existing Deployment

## Current Azure Architecture

- **Database**: `unitedwerise-db.postgres.database.azure.com` (Azure Database for PostgreSQL)
- **Backend**: Azure Container Apps (`unitedwerise-backend`)
- **Frontend**: Azure Static Web Apps (`yellow-mud-043d1ca0f`)
- **Registry**: Azure Container Registry (`uwracr2425.azurecr.io`)

## Integration Strategy

### Step 1: Enable Vector Extension in Existing PostgreSQL

```sql
-- Connect to your Azure PostgreSQL database
-- psql "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?sslmode=require"

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to existing posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector index for fast similarity search
CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_embedding_idx 
ON posts USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Verify setup
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Step 2: Set Up Azure OpenAI Service

```bash
# Create Azure OpenAI resource
az cognitiveservices account create \
  --name "unitedwerise-openai" \
  --resource-group "unitedwerise-rg" \
  --kind "OpenAI" \
  --sku "S0" \
  --location "eastus" \
  --custom-domain "unitedwerise-openai"

# Deploy required models
az cognitiveservices account deployment create \
  --resource-group "unitedwerise-rg" \
  --name "unitedwerise-openai" \
  --deployment-name "text-embedding-ada-002" \
  --model-name "text-embedding-ada-002" \
  --model-version "2" \
  --sku-capacity 10 \
  --sku-name "Standard"

az cognitiveservices account deployment create \
  --resource-group "unitedwerise-rg" \
  --name "unitedwerise-openai" \
  --deployment-name "gpt-35-turbo" \
  --model-name "gpt-35-turbo" \
  --model-version "0613" \
  --sku-capacity 10 \
  --sku-name "Standard"

# Get API key
az cognitiveservices account keys list \
  --name "unitedwerise-openai" \
  --resource-group "unitedwerise-rg"
```

### Step 3: Update Container Apps Environment Variables

```bash
# Update your existing backend container app
az containerapp update \
  --name "unitedwerise-backend" \
  --resource-group "unitedwerise-rg" \
  --set-env-vars \
    "AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/" \
    "AZURE_OPENAI_API_KEY=your-actual-key-here" \
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002" \
    "AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-35-turbo" \
    "ENABLE_SEMANTIC_TOPICS=true"
```

### Step 4: Database Migration Script

```typescript
// backend/src/migrations/add-vector-support.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addVectorSupport() {
  try {
    // Enable vector extension
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;
    
    // Add embedding column
    await prisma.$executeRaw`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS embedding vector(1536);
    `;
    
    // Create index for performance
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_embedding_idx 
      ON posts USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `;
    
    console.log('✓ Vector support added to database');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run: npx ts-node src/migrations/add-vector-support.ts
addVectorSupport();
```

### Step 5: Updated Service Implementation

```typescript
// backend/src/services/azureVectorService.ts
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AzureVectorService {
  private openAI: OpenAIClient;
  
  constructor() {
    this.openAI = new OpenAIClient(
      process.env.AZURE_OPENAI_ENDPOINT!,
      new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
    );
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openAI.getEmbeddings(
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT!,
      [text.slice(0, 8000)] // Token limit
    );
    return response.data[0].embedding;
  }
  
  async findSimilarPosts(embedding: number[], limit: number = 10) {
    const result = await prisma.$queryRaw`
      SELECT 
        id, 
        content, 
        author_id,
        created_at,
        1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
      FROM posts 
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit};
    `;
    return result;
  }
  
  async generateTopicSummary(posts: Array<{content: string}>): Promise<{
    prevailingPosition: string;
    leadingCritique: string;
    title: string;
  }> {
    const prompt = `Analyze these ${posts.length} political discussion posts and provide:
1. A clear topic title (4-6 words)
2. The prevailing position (most common viewpoint in 1-2 sentences)
3. The leading critique (strongest opposing argument in 1-2 sentences)

Posts to analyze:
${posts.map(p => `- ${p.content}`).join('\n')}

Respond in JSON format:
{
  "title": "Topic Title Here",
  "prevailingPosition": "Most common viewpoint...",
  "leadingCritique": "Main opposing argument..."
}`;

    const response = await this.openAI.getChatCompletions(
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT!,
      [{ role: "user", content: prompt }],
      { maxTokens: 300, temperature: 0.3 }
    );
    
    return JSON.parse(response.choices[0].message?.content || '{}');
  }
}
```

### Step 6: Container Build & Deployment

```bash
# Build and deploy updated backend
cd backend
docker build -t uwracr2425.azurecr.io/unitedwerise-backend:semantic-topics .
docker push uwracr2425.azurecr.io/unitedwerise-backend:semantic-topics

# Update container app with new image
az containerapp update \
  --name "unitedwerise-backend" \
  --resource-group "unitedwerise-rg" \
  --image "uwracr2425.azurecr.io/unitedwerise-backend:semantic-topics"
```

## Cost Breakdown (Your Actual Deployment)

### Current Monthly Costs
```
Azure Container Apps (backend):     ~$30
Azure Static Web Apps (frontend):  ~$10  
Azure Database PostgreSQL:         ~$25
Azure Container Registry:          ~$5
TOTAL CURRENT:                      ~$70/month
```

### Adding Semantic Features
```
Azure OpenAI (pay-per-use):
- At 100 users/day:   ~$15/month
- At 1000 users/day:  ~$35/month
- At 5000 users/day:  ~$75/month

Vector storage: $0 (uses existing PostgreSQL)
```

### Total Projected Costs
```
Testing (10 users):    $75/month  ($91 under budget)
Growth (1000 users):   $105/month ($61 under budget)  
Scale (5000 users):    $145/month ($21 under budget)
```

## Testing Commands

```bash
# Test vector extension
curl -X POST "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/debug/vector-test" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test embedding generation"}'

# Test topic discovery
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/topic-navigation/trending"

# Test similarity search
curl -X POST "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/posts/similar" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content": "Healthcare policy discussion", "limit": 5}'
```

## Advantages of This Approach

1. **Zero New Infrastructure** - Uses your existing Azure resources
2. **Native Performance** - PostgreSQL vector operations are fast
3. **Cost Predictable** - Only pay for AI when users are active
4. **Fully Managed** - No VMs or containers to maintain
5. **Scales Automatically** - Azure OpenAI handles any load
6. **Within Budget** - Stays under $166/month even at scale

## Rollback Plan

If costs exceed expectations:
1. Disable real-time embedding generation
2. Batch process embeddings daily
3. Cache topic summaries for 24 hours
4. Reduce similarity threshold to focus on top topics only

This approach integrates seamlessly with your existing Azure deployment while adding sophisticated semantic capabilities without infrastructure overhead.