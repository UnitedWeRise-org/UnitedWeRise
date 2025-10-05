/**
 * Azure Configuration for UnitedWeRise Platform
 *
 * Centralizes Azure service configuration and environment detection
 */

import { isDevelopment, isProduction, getEnvironment } from '../utils/environment';

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  embeddingDeployment: string;
  chatDeployment: string;
  tier1Reasoning: string;
  tier2Reasoning: string;
  generalChat: string;
  vision: string;
  enabled: boolean;
}

interface DatabaseConfig {
  url: string;
  vectorEnabled: boolean;
  maxConnections?: number;
}

interface AzureConfig {
  openai: AzureOpenAIConfig;
  database: DatabaseConfig;
  environment: 'development' | 'production' | 'staging';
}

export function getAzureConfig(): AzureConfig {
  const environment = getEnvironment();
  
  // Azure OpenAI Configuration
  const openaiEnabled = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);

  const openai: AzureOpenAIConfig = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',

    // Tier-based deployments (future-proof architecture)
    tier1Reasoning: process.env.AZURE_OPENAI_TIER1_REASONING || 'gpt-4o',
    tier2Reasoning: process.env.AZURE_OPENAI_TIER2_REASONING || 'gpt-4o',
    generalChat: process.env.AZURE_OPENAI_GENERAL_CHAT || 'gpt-4o-mini',
    vision: process.env.AZURE_OPENAI_VISION || 'gpt-4o-mini',

    // Embeddings (unchanged)
    embeddingDeployment: process.env.AZURE_OPENAI_EMBEDDINGS ||
                          process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ||
                          'text-embedding-ada-002',

    // SAFETY NET: Backwards compatibility
    chatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ||
                     process.env.AZURE_OPENAI_GENERAL_CHAT ||
                     'gpt-4o-mini',

    enabled: openaiEnabled
  };
  
  // Database Configuration
  const database: DatabaseConfig = {
    url: process.env.DATABASE_URL || '',
    vectorEnabled: process.env.ENABLE_VECTOR_SEARCH === 'true',
    maxConnections: environment === 'production' ? 20 : 5
  };
  
  return {
    openai,
    database,
    environment
  };
}

export function validateAzureConfig(): { valid: boolean; errors: string[] } {
  const config = getAzureConfig();
  const errors: string[] = [];
  
  // Check database URL
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }
  
  // Check Azure OpenAI configuration if enabled
  if (config.openai.enabled) {
    if (!config.openai.endpoint) {
      errors.push('AZURE_OPENAI_ENDPOINT is required when Azure OpenAI is enabled');
    }
    if (!config.openai.apiKey) {
      errors.push('AZURE_OPENAI_API_KEY is required when Azure OpenAI is enabled');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Environment-specific configuration (now using centralized functions)

// Semantic features configuration
export const getSemanticConfig = () => ({
  enabled: process.env.ENABLE_SEMANTIC_TOPICS === 'true',
  provider: process.env.SEMANTIC_PROVIDER || (isProduction() ? 'azure' : 'local'),
  batchSize: parseInt(process.env.SEMANTIC_BATCH_SIZE || '10'),
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.60'),
  maxTopicsPerDiscovery: parseInt(process.env.MAX_TOPICS_PER_DISCOVERY || '10')
});

export default { getAzureConfig, validateAzureConfig, getSemanticConfig };