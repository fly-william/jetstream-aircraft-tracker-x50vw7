import { Request, Response, NextFunction } from 'express'; // v4.18.2
import jwt from 'jsonwebtoken'; // v9.0.0
import { BearerStrategy } from 'passport-azure-ad'; // v4.3.4
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { createClient } from 'redis'; // v4.6.7
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';
import { logger } from '../../common/utils/logger';

// Constants
const TOKEN_HEADER = 'Authorization';
const TOKEN_PREFIX = 'Bearer';
const SESSION_TIMEOUT = 1800; // 30 minutes in seconds

// Role definitions
const ROLES = {
    OPERATIONS: 'operations',
    SALES: 'sales',
    CUSTOMER_SERVICE: 'customer_service',
    MANAGEMENT: 'management',
    SYSTEM_ADMIN: 'system_admin'
} as const;

// Role hierarchy for inheritance
const ROLE_HIERARCHY = {
    system_admin: [ROLES.OPERATIONS, ROLES.SALES, ROLES.CUSTOMER_SERVICE, ROLES.MANAGEMENT],
    operations: [ROLES.SALES, ROLES.CUSTOMER_SERVICE],
    management: [ROLES.SALES, ROLES.CUSTOMER_SERVICE],
    sales: [],
    customer_service: []
} as const;

// Redis client for token blacklist
const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        tls: process.env.NODE_ENV === 'production'
    }
});

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'auth_limit',
    points: 100, // Number of requests
    duration: 60 // Per minute
});

// Azure AD B2C configuration
const azureConfig = {
    identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA,
    clientID: process.env.AZURE_AD_CLIENT_ID,
    validateIssuer: true,
    issuer: process.env.AZURE_AD_ISSUER,
    passReqToCallback: false,
    loggingLevel: 'info'
};

// Bearer strategy for Azure AD B2C
const bearerStrategy = new BearerStrategy(azureConfig, (token: any, done: any) => {
    done(null, token);
});

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
        tenantId: string;
        sessionExpiry: Date;
    };
    correlationId?: string;
}

/**
 * Validates JWT token and extracts user information
 * @param req Express request object
 * @param res Express response object
 * @param next Next middleware function
 */
export const validateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Generate correlation ID for request tracing
        req.correlationId = uuidv4();

        // Rate limiting check
        await rateLimiter.consume(req.ip);

        // Extract token from header
        const authHeader = req.header(TOKEN_HEADER);
        if (!authHeader?.startsWith(TOKEN_PREFIX)) {
            throw new Error(ErrorCode.UNAUTHORIZED);
        }

        const token = authHeader.slice(TOKEN_PREFIX.length + 1);

        // Check token blacklist
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            throw new Error(ErrorCode.SESSION_EXPIRED);
        }

        // Verify token with Azure AD B2C
        const decodedToken: any = await new Promise((resolve, reject) => {
            bearerStrategy.authenticate(req, {
                session: false,
                failWithError: true
            }, (err: any, token: any) => {
                if (err) reject(err);
                resolve(token);
            });
        });

        // Validate token claims
        if (!decodedToken?.oid || !decodedToken?.roles || !decodedToken?.tid) {
            throw new Error(ErrorCode.INVALID_TOKEN);
        }

        // Check session timeout
        const tokenIssuedAt = decodedToken.iat * 1000;
        if (Date.now() - tokenIssuedAt > SESSION_TIMEOUT * 1000) {
            await redisClient.set(`blacklist:${token}`, '1', 'EX', SESSION_TIMEOUT);
            throw new Error(ErrorCode.SESSION_EXPIRED);
        }

        // Attach user information to request
        req.user = {
            id: decodedToken.oid,
            email: decodedToken.email,
            roles: decodedToken.roles,
            tenantId: decodedToken.tid,
            sessionExpiry: new Date(tokenIssuedAt + SESSION_TIMEOUT * 1000)
        };

        // Log successful authentication
        logger.audit(req.user.id, 'Authentication successful', {
            correlationId: req.correlationId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        next();
    } catch (error) {
        logger.error('Authentication failed', error as Error, {
            correlationId: req.correlationId,
            ipAddress: req.ip
        });

        res.status(HttpStatusCode.UNAUTHORIZED).json({
            error: error.message || ErrorCode.UNAUTHORIZED,
            correlationId: req.correlationId
        });
    }
};

/**
 * Middleware factory for role-based access control
 * @param allowedRoles Array of roles allowed to access the resource
 */
export const requireRoles = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw new Error(ErrorCode.UNAUTHORIZED);
            }

            // Check if user has any of the allowed roles or inherited roles
            const hasAllowedRole = req.user.roles.some(userRole => {
                const inheritedRoles = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || [];
                return allowedRoles.some(allowedRole => 
                    userRole === allowedRole || inheritedRoles.includes(allowedRole)
                );
            });

            if (!hasAllowedRole) {
                logger.security('Authorization failed', {
                    userId: req.user.id,
                    requiredRoles: allowedRoles,
                    userRoles: req.user.roles,
                    correlationId: req.correlationId
                });

                res.status(HttpStatusCode.FORBIDDEN).json({
                    error: ErrorCode.AUTHORIZATION_ERROR,
                    correlationId: req.correlationId
                });
                return;
            }

            logger.audit(req.user.id, 'Authorization successful', {
                roles: req.user.roles,
                allowedRoles,
                correlationId: req.correlationId
            });

            next();
        } catch (error) {
            logger.error('Authorization error', error as Error, {
                correlationId: req.correlationId
            });

            res.status(HttpStatusCode.UNAUTHORIZED).json({
                error: ErrorCode.UNAUTHORIZED,
                correlationId: req.correlationId
            });
        }
    };
};