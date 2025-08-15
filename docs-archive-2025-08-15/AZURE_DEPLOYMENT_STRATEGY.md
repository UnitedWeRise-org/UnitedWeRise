# Azure Deployment Strategy for Semantic Topic Discovery

## Optimal Architecture for Your Azure Nonprofit Grant

### Overview
With your $2000/year Azure grant ($166/month), this strategy keeps passive costs near zero while scaling efficiently to 1000+ DAU.

### Service Selection

#### 1. **Vector Search: Azure Cosmos DB for PostgreSQL**
```bash
# Extension to enable in your existing database
CREATE EXTENSION vector;

# Add vector column to posts table
ALTER TABLE posts ADD COLUMN embedding vector(1536);
CREATE INDEX ON posts USING ivfflat (embedding vector_cosine_ops);
```

**Costs:**
- Passive: $0 (uses existing DB)
- Active (1000 DAU): ~$20/month additional
- Benefits: No separate vector DB needed, native PostgreSQL

#### 2. **AI Services: Azure OpenAI**
```typescript
// backend/.env.production
AZURE_OPENAI_ENDPOINT="https://your-instance.openai.azure.com/"
AZURE_OPENAI_API_KEY="your-key"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-35-turbo"
AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-ada-002"
```

**Costs:**
- Passive: $0 (pay per request)
- Active (1000 DAU): ~$30/month
- Embeddings: $0.0001 per 1K tokens
- Summaries: $0.0005 per 1K tokens

### Implementation Steps

#### Step 1: Set Up Azure OpenAI
```bash
# Using Azure CLI
az cognitiveservices account create \
  --name "unitedwerise-openai" \
  --resource-group "unitedwerise-rg" \
  --kind "OpenAI" \
  --sku "S0" \
  --location "eastus"

# Deploy models
az cognitiveservices account deployment create \
  --name "unitedwerise-openai" \
  --resource-group "unitedwerise-rg" \
  --deployment-name "gpt-35-turbo" \
  --model-name "gpt-35-turbo" \
  --model-version "0613"
```

#### Step 2: Update Backend Services
```typescript
// src/services/azureEmbeddingService.ts
import { OpenAIClient } from "@azure/openai";

export class AzureEmbeddingService {
  private client: OpenAIClient;
  
  constructor() {
    this.client = new OpenAIClient(
      process.env.AZURE_OPENAI_ENDPOINT!,
      new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
    );
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.getEmbeddings(
      "text-embedding-ada-002",
      [text]
    );
    return response.data[0].embedding;
  }
  
  async generateSummary(posts: string[]): Promise<{
    prevailingPosition: string;
    leadingCritique: string;
  }> {
    const prompt = `Analyze these ${posts.length} posts and provide:
    1. The prevailing position (most common viewpoint)
    2. The leading critique (strongest opposing argument)
    
    Posts: ${posts.join('\n---\n')}`;
    
    const response = await this.client.getChatCompletions(
      "gpt-35-turbo",
      [{ role: "system", content: prompt }]
    );
    
    return JSON.parse(response.choices[0].message.content);
  }
}
```

#### Step 3: Environment-Specific Configuration
```typescript
// src/config/environment.ts
export const config = {
  development: {
    embedding: 'local', // Use @xenova/transformers
    ai: 'ollama',       // Use local Ollama
    vectorDb: 'qdrant'  // Use local Qdrant
  },
  production: {
    embedding: 'azure',     // Azure OpenAI embeddings
    ai: 'azure-openai',     // Azure OpenAI for summaries
    vectorDb: 'cosmos-pg'   // Cosmos DB PostgreSQL
  }
};
```

### Cost Projections

| Month | Users | Passive | Active | Total | Within Budget? |
|-------|-------|---------|--------|-------|----------------|
| 1 (Testing) | 10 | $40 | $5 | $45 | ✅ Yes ($121 remaining) |
| 3 | 100 | $40 | $15 | $55 | ✅ Yes ($111 remaining) |
| 6 | 500 | $40 | $25 | $65 | ✅ Yes ($101 remaining) |
| 12 | 1000 | $40 | $35 | $75 | ✅ Yes ($91 remaining) |
| 18 | 5000 | $40 | $85 | $125 | ✅ Yes ($41 remaining) |
| 24 | 10000 | $40 | $150 | $190 | ⚠️ Over (need revenue) |

### Scaling Strategy

#### Phase 1: Launch (0-100 users)
- Use Azure OpenAI free tier limits
- Monitor usage closely
- Total cost: ~$45/month

#### Phase 2: Growth (100-1000 users)  
- Optimize prompts to reduce tokens
- Cache common embeddings
- Total cost: ~$75/month

#### Phase 3: Revenue (1000+ users)
- Implement premium features
- Add sponsorship/ads
- Revenue should exceed costs

### Local Development Setup

```bash
# .env.development
USE_LOCAL_SERVICES=true
EMBEDDING_SERVICE=xenova
AI_SERVICE=ollama
VECTOR_DB=qdrant

# .env.production  
USE_LOCAL_SERVICES=false
EMBEDDING_SERVICE=azure
AI_SERVICE=azure-openai
VECTOR_DB=cosmos-pg
```

### Monitoring & Optimization

```typescript
// Track costs per operation
class CostTracker {
  static logEmbedding(tokens: number) {
    const cost = tokens * 0.0001 / 1000;
    console.log(`Embedding cost: $${cost.toFixed(6)}`);
  }
  
  static logSummary(tokens: number) {
    const cost = tokens * 0.0005 / 1000;
    console.log(`Summary cost: $${cost.toFixed(6)}`);
  }
}
```

### Advantages of This Approach

1. **Zero Infrastructure Management** - No VMs, no Docker containers to maintain
2. **Automatic Scaling** - Handles viral growth without intervention
3. **Pay-Per-Use** - No costs when not in use (nights, weekends)
4. **Enterprise Reliability** - 99.9% SLA from Azure
5. **Better AI Quality** - GPT-3.5 > Qwen2.5 for English content
6. **Geographic Distribution** - Azure's global network
7. **Compliance Ready** - SOC2, HIPAA compatible if needed

### Migration Path

1. **Today**: Continue local development with Qdrant + Ollama
2. **Next Week**: Set up Azure OpenAI in test environment
3. **Before Launch**: Switch production to Azure services
4. **Post-Launch**: Monitor costs, optimize as needed

### Fallback Options

If costs exceed budget:
1. **Reduce AI calls**: Only summarize top 5 topics daily
2. **Cache aggressively**: Store embeddings for 30 days
3. **Batch operations**: Process summaries hourly, not real-time
4. **Hybrid approach**: Use local for non-critical, Azure for important

This strategy ensures you stay within budget during growth while providing the best possible user experience.