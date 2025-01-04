import { Request, Response } from 'express'; // v4.18.2
import { BearerStrategy } from 'passport-azure-ad'; // v4.3.4
import { sign, verify } from 'jsonwebtoken'; // v9.0.0
import { createClient } from 'redis'; // v4.6.7
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import passport from 'passport'; // v0.6.0
import { ErrorCode } from '../../common/constants/error-codes';
import { HttpStatusCode } from '../../common/constants/status-codes';
import { logger } from '../../common/utils/logger';

// Constants for token management and rate limiting
const ACCESS_TOKEN_EXPIRY = 30 * 60; // 30 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const MFA_ATTEMPT_LIMIT = 5;
const LOGIN_RATE_LIMIT = 10;
const TOKEN_BLACKLIST_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

/**
 * Authentication controller implementing OAuth 2.0 with Azure AD B2C
 * Handles user authentication, MFA verification, and token management
 */
export class AuthController {
    private azureADStrategy: BearerStrategy;
    private redisClient: ReturnType<typeof createClient>;
    private rateLimiter: RateLimiterRedis;

    constructor() {
        // Initialize Azure AD B2C strategy
        this.azureADStrategy = new BearerStrategy({
            identityMetadata: `https://${process.env.AZURE_B2C_TENANT}.b2clogin.com/${process.env.AZURE_B2C_TENANT}.onmicrosoft.com/v2.0/.well-known/openid-configuration`,
            clientID: process.env.AZURE_B2C_CLIENT_ID!,
            policyName: process.env.AZURE_B2C_POLICY_NAME!,
            isB2C: true,
            validateIssuer: true,
            loggingLevel: 'info',
            loggingNoPII: true,
            passReqToCallback: false
        }, (token, done) => {
            done(null, token);
        });

        // Initialize Redis client with cluster support
        this.redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
            }
        });

        // Configure rate limiter
        this.rateLimiter = new RateLimiterRedis({
            storeClient: this.redisClient,
            keyPrefix: 'auth_limit',
            points: LOGIN_RATE_LIMIT,
            duration: 60 * 60 // 1 hour
        });

        // Initialize passport with Azure AD strategy
        passport.use(this.azureADStrategy);

        // Setup token cleanup job
        this.setupTokenCleanup();
    }

    /**
     * Handles user login with rate limiting and MFA verification
     */
    public async login(req: Request, res: Response): Promise<void> {
        try {
            // Check rate limit
            await this.rateLimiter.consume(req.ip);

            // Authenticate with Azure AD B2C
            passport.authenticate('oauth-bearer', { session: false }, async (err, user) => {
                if (err || !user) {
                    logger.error('Authentication failed', err);
                    res.status(HttpStatusCode.UNAUTHORIZED).json({
                        code: ErrorCode.UNAUTHORIZED,
                        message: 'Authentication failed'
                    });
                    return;
                }

                // Generate token pair
                const accessToken = sign(
                    { sub: user.oid, roles: user.roles },
                    process.env.JWT_SECRET!,
                    { expiresIn: ACCESS_TOKEN_EXPIRY }
                );

                const refreshToken = sign(
                    { sub: user.oid },
                    process.env.JWT_REFRESH_SECRET!,
                    { expiresIn: REFRESH_TOKEN_EXPIRY }
                );

                // Store refresh token in Redis
                await this.redisClient.set(
                    `refresh_${user.oid}`,
                    refreshToken,
                    { EX: REFRESH_TOKEN_EXPIRY }
                );

                // Log successful login
                logger.audit(user.oid, 'LOGIN', {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });

                res.status(HttpStatusCode.OK).json({
                    accessToken,
                    refreshToken,
                    expiresIn: ACCESS_TOKEN_EXPIRY
                });
            })(req, res);
        } catch (error) {
            logger.error('Login error', error as Error);
            res.status(HttpStatusCode.UNAUTHORIZED).json({
                code: ErrorCode.UNAUTHORIZED,
                message: 'Login failed'
            });
        }
    }

    /**
     * Handles user logout with token revocation
     */
    public async logout(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    code: ErrorCode.INVALID_TOKEN,
                    message: 'Token not provided'
                });
                return;
            }

            const decoded = verify(token, process.env.JWT_SECRET!) as { sub: string };

            // Add token to blacklist
            await this.redisClient.set(
                `blacklist_${token}`,
                'true',
                { EX: TOKEN_BLACKLIST_EXPIRY }
            );

            // Remove refresh token
            await this.redisClient.del(`refresh_${decoded.sub}`);

            logger.audit(decoded.sub, 'LOGOUT', {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(HttpStatusCode.OK).json({
                message: 'Logged out successfully'
            });
        } catch (error) {
            logger.error('Logout error', error as Error);
            res.status(HttpStatusCode.BAD_REQUEST).json({
                code: ErrorCode.INVALID_TOKEN,
                message: 'Invalid token'
            });
        }
    }

    /**
     * Refreshes expired access token using refresh token
     */
    public async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    code: ErrorCode.INVALID_TOKEN,
                    message: 'Refresh token not provided'
                });
                return;
            }

            // Verify refresh token
            const decoded = verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };

            // Check if token is in Redis
            const storedToken = await this.redisClient.get(`refresh_${decoded.sub}`);
            if (!storedToken || storedToken !== refreshToken) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    code: ErrorCode.INVALID_TOKEN,
                    message: 'Invalid refresh token'
                });
                return;
            }

            // Generate new token pair
            const accessToken = sign(
                { sub: decoded.sub },
                process.env.JWT_SECRET!,
                { expiresIn: ACCESS_TOKEN_EXPIRY }
            );

            const newRefreshToken = sign(
                { sub: decoded.sub },
                process.env.JWT_REFRESH_SECRET!,
                { expiresIn: REFRESH_TOKEN_EXPIRY }
            );

            // Update refresh token in Redis
            await this.redisClient.set(
                `refresh_${decoded.sub}`,
                newRefreshToken,
                { EX: REFRESH_TOKEN_EXPIRY }
            );

            logger.audit(decoded.sub, 'TOKEN_REFRESH', {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(HttpStatusCode.OK).json({
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: ACCESS_TOKEN_EXPIRY
            });
        } catch (error) {
            logger.error('Token refresh error', error as Error);
            res.status(HttpStatusCode.UNAUTHORIZED).json({
                code: ErrorCode.INVALID_TOKEN,
                message: 'Invalid refresh token'
            });
        }
    }

    /**
     * Verifies MFA code with rate limiting
     */
    public async verifyMFA(req: Request, res: Response): Promise<void> {
        try {
            const { mfaCode, sessionId } = req.body;

            // Check MFA attempt rate limit
            const mfaLimiter = new RateLimiterRedis({
                storeClient: this.redisClient,
                keyPrefix: `mfa_${sessionId}`,
                points: MFA_ATTEMPT_LIMIT,
                duration: 60 * 15 // 15 minutes
            });

            await mfaLimiter.consume(req.ip);

            // Verify MFA code with Azure AD B2C
            const result = await this.azureADStrategy.verify(mfaCode, sessionId);
            if (!result) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    code: ErrorCode.MFA_REQUIRED,
                    message: 'Invalid MFA code'
                });
                return;
            }

            logger.audit(sessionId, 'MFA_VERIFIED', {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(HttpStatusCode.OK).json({
                message: 'MFA verified successfully'
            });
        } catch (error) {
            logger.error('MFA verification error', error as Error);
            res.status(HttpStatusCode.UNAUTHORIZED).json({
                code: ErrorCode.MFA_REQUIRED,
                message: 'MFA verification failed'
            });
        }
    }

    /**
     * Sets up periodic cleanup of expired tokens
     */
    private setupTokenCleanup(): void {
        setInterval(async () => {
            try {
                const keys = await this.redisClient.keys('blacklist_*');
                for (const key of keys) {
                    const ttl = await this.redisClient.ttl(key);
                    if (ttl <= 0) {
                        await this.redisClient.del(key);
                    }
                }
            } catch (error) {
                logger.error('Token cleanup error', error as Error);
            }
        }, 60 * 60 * 1000); // Run every hour
    }
}