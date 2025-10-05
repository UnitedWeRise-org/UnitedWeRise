"use strict";
/**
 * Azure Configuration for UnitedWeRise Platform
 *
 * Centralizes Azure service configuration and environment detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSemanticConfig = void 0;
exports.getAzureConfig = getAzureConfig;
exports.validateAzureConfig = validateAzureConfig;
const environment_1 = require("../utils/environment");
function getAzureConfig() {
    const environment = (0, environment_1.getEnvironment)();
    // Azure OpenAI Configuration
    const openaiEnabled = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
    const openai = {
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
    const database = {
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
function validateAzureConfig() {
    const config = getAzureConfig();
    const errors = [];
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
const getSemanticConfig = () => ({
    enabled: process.env.ENABLE_SEMANTIC_TOPICS === 'true',
    provider: process.env.SEMANTIC_PROVIDER || ((0, environment_1.isProduction)() ? 'azure' : 'local'),
    batchSize: parseInt(process.env.SEMANTIC_BATCH_SIZE || '10'),
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.60'),
    maxTopicsPerDiscovery: parseInt(process.env.MAX_TOPICS_PER_DISCOVERY || '10')
});
exports.getSemanticConfig = getSemanticConfig;
exports.default = { getAzureConfig, validateAzureConfig, getSemanticConfig: exports.getSemanticConfig };
//# sourceMappingURL=azureConfig.js.map