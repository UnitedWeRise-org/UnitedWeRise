"use strict";
/**
 * Azure Configuration for UnitedWeRise Platform
 *
 * Centralizes Azure service configuration and environment detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSemanticConfig = exports.isProduction = exports.isDevelopment = void 0;
exports.getAzureConfig = getAzureConfig;
exports.validateAzureConfig = validateAzureConfig;
function getAzureConfig() {
    const environment = (process.env.NODE_ENV || 'development');
    // Azure OpenAI Configuration
    const openaiEnabled = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
    const openai = {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
        apiKey: process.env.AZURE_OPENAI_API_KEY || '',
        embeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
        chatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-35-turbo',
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
// Environment-specific configuration
const isDevelopment = () => process.env.NODE_ENV === 'development';
exports.isDevelopment = isDevelopment;
const isProduction = () => process.env.NODE_ENV === 'production';
exports.isProduction = isProduction;
// Semantic features configuration
const getSemanticConfig = () => ({
    enabled: process.env.ENABLE_SEMANTIC_TOPICS === 'true',
    provider: process.env.SEMANTIC_PROVIDER || ((0, exports.isProduction)() ? 'azure' : 'local'),
    batchSize: parseInt(process.env.SEMANTIC_BATCH_SIZE || '10'),
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.60'),
    maxTopicsPerDiscovery: parseInt(process.env.MAX_TOPICS_PER_DISCOVERY || '10')
});
exports.getSemanticConfig = getSemanticConfig;
exports.default = { getAzureConfig, validateAzureConfig, getSemanticConfig: exports.getSemanticConfig };
//# sourceMappingURL=azureConfig.js.map