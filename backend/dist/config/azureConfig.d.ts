/**
 * Azure Configuration for UnitedWeRise Platform
 *
 * Centralizes Azure service configuration and environment detection
 */
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
export declare function getAzureConfig(): AzureConfig;
export declare function validateAzureConfig(): {
    valid: boolean;
    errors: string[];
};
export declare const getSemanticConfig: () => {
    enabled: boolean;
    provider: string;
    batchSize: number;
    similarityThreshold: number;
    maxTopicsPerDiscovery: number;
};
declare const _default: {
    getAzureConfig: typeof getAzureConfig;
    validateAzureConfig: typeof validateAzureConfig;
    getSemanticConfig: () => {
        enabled: boolean;
        provider: string;
        batchSize: number;
        similarityThreshold: number;
        maxTopicsPerDiscovery: number;
    };
};
export default _default;
//# sourceMappingURL=azureConfig.d.ts.map