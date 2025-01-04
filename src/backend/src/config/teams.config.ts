import dotenv from 'dotenv'; // ^16.0.0

// Load environment variables
dotenv.config();

// Type Definitions
export type DepartmentType = 'operations' | 'sales' | 'customerService' | 'management' | 'emergency';

// Interfaces
export interface IChannelConfig {
    channelId: string;
    priority: number;
    fallbackChannelId?: string;
}

export interface IRetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    timeout: number;
}

export interface ICircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
}

export interface ITeamsConfig {
    graphApiEndpoint: string;
    clientId: string;
    clientSecret: string;
    tenantId: string;
    channelMappings: Record<DepartmentType, IChannelConfig[]>;
    retryConfig: IRetryConfig;
    circuitBreaker: ICircuitBreakerConfig;
}

// Default Configurations
export const DEFAULT_RETRY_CONFIG: IRetryConfig = {
    maxRetries: 3,
    baseDelay: 200,
    maxDelay: 2000,
    timeout: 5000
};

export const DEFAULT_CIRCUIT_BREAKER: ICircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 10000
};

// Validation Functions
const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const validateConfig = (config: ITeamsConfig): boolean => {
    // Validate Graph API endpoint
    if (!isValidUrl(config.graphApiEndpoint)) {
        throw new Error('Invalid Graph API endpoint URL');
    }

    // Validate Azure AD credentials
    if (!isValidUUID(config.clientId)) {
        throw new Error('Invalid client ID format');
    }

    if (!isValidUUID(config.tenantId)) {
        throw new Error('Invalid tenant ID format');
    }

    if (!config.clientSecret || config.clientSecret.length < 1) {
        throw new Error('Client secret is required');
    }

    // Validate channel mappings
    const departments: DepartmentType[] = ['operations', 'sales', 'customerService', 'management', 'emergency'];
    
    for (const dept of departments) {
        const channels = config.channelMappings[dept];
        if (!Array.isArray(channels) || channels.length === 0) {
            throw new Error(`Missing channel configuration for department: ${dept}`);
        }

        for (const channel of channels) {
            if (!channel.channelId) {
                throw new Error(`Invalid channel ID for department: ${dept}`);
            }
            if (channel.priority < 1 || channel.priority > 5) {
                throw new Error(`Invalid priority for channel in department: ${dept}`);
            }
        }
    }

    // Validate retry configuration
    const { retryConfig } = config;
    if (
        retryConfig.maxRetries < 1 || retryConfig.maxRetries > 5 ||
        retryConfig.baseDelay < 100 || retryConfig.baseDelay > 1000 ||
        retryConfig.maxDelay < 1000 || retryConfig.maxDelay > 5000 ||
        retryConfig.timeout > 5000
    ) {
        throw new Error('Invalid retry configuration');
    }

    // Validate circuit breaker configuration
    const { circuitBreaker } = config;
    if (
        circuitBreaker.failureThreshold < 3 || circuitBreaker.failureThreshold > 10 ||
        circuitBreaker.resetTimeout < 5000 || circuitBreaker.resetTimeout > 30000
    ) {
        throw new Error('Invalid circuit breaker configuration');
    }

    return true;
};

// Configuration Object
export const teamsConfig: ITeamsConfig = {
    graphApiEndpoint: process.env.TEAMS_GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0',
    clientId: process.env.TEAMS_CLIENT_ID || '',
    clientSecret: process.env.TEAMS_CLIENT_SECRET || '',
    tenantId: process.env.TEAMS_TENANT_ID || '',
    channelMappings: {
        operations: [{
            channelId: process.env.TEAMS_CHANNEL_OPERATIONS_PRIMARY || '',
            priority: 1,
            fallbackChannelId: process.env.TEAMS_CHANNEL_OPERATIONS_BACKUP || ''
        }],
        sales: [{
            channelId: process.env.TEAMS_CHANNEL_SALES_PRIMARY || '',
            priority: 1,
            fallbackChannelId: process.env.TEAMS_CHANNEL_SALES_BACKUP || ''
        }],
        customerService: [{
            channelId: process.env.TEAMS_CHANNEL_CUSTOMER_SERVICE_PRIMARY || '',
            priority: 1,
            fallbackChannelId: process.env.TEAMS_CHANNEL_CUSTOMER_SERVICE_BACKUP || ''
        }],
        management: [{
            channelId: process.env.TEAMS_CHANNEL_MANAGEMENT_PRIMARY || '',
            priority: 1,
            fallbackChannelId: process.env.TEAMS_CHANNEL_MANAGEMENT_BACKUP || ''
        }],
        emergency: [{
            channelId: process.env.TEAMS_CHANNEL_EMERGENCY_PRIMARY || '',
            priority: 1,
            fallbackChannelId: process.env.TEAMS_CHANNEL_EMERGENCY_BACKUP || ''
        }]
    },
    retryConfig: DEFAULT_RETRY_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER
};

// Validate configuration on module load
validateConfig(teamsConfig);

export default teamsConfig;