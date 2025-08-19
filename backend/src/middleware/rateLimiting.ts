import rateLimit from 'express-rate-limit';

// Custom key generator for Azure Container Apps - strips port numbers from IPs
const azureKeyGenerator = (request: any) => {
  if (!request.ip) {
    console.error('Warning: request.ip is missing!');
    return request.socket.remoteAddress || 'unknown';
  }
  // Strip port number from IP for Azure Container Apps compatibility
  return request.ip.replace(/:\d+[^:]*$/, '');
};

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for login/register
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: azureKeyGenerator
});

// Moderate rate limiting for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator
});

// Intelligent rate limiting with burst tolerance
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: any) => {
    // Admin users get unlimited requests
    if (req.user?.isAdmin) {
      return 10000; // Effectively unlimited for admins
    }
    // Higher limits for authenticated users
    if (req.user) {
      return 500; // 500 requests per 15 minutes for authenticated users
    }
    return 1000; // 1000 requests per 15 minutes for anonymous users (increased for site functionality)
  },
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Use user ID for authenticated requests, IP for anonymous
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    return azureKeyGenerator(req);
  },
  // Allow burst tolerance - skip counting successful requests briefly
  skipSuccessfulRequests: false,
  // Custom handler for when limit is exceeded
  handler: (req: any, res: any) => {
    const isAuthenticated = !!req.user;
    const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000);
    
    console.warn(`Rate limit exceeded for ${isAuthenticated ? 'user' : 'IP'}: ${req.user?.id || req.ip}`);
    
    res.status(429).json({
      error: isAuthenticated 
        ? 'You are making requests too quickly. Please wait a moment before trying again.'
        : 'Too many requests from this network. Please try again later.',
      retryAfter: retryAfter
    });
  }
});

// Burst rate limiter for very rapid requests (separate from main limiter)
export const burstLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req: any) => {
    // Admin users get unlimited burst requests
    if (req.user?.isAdmin) {
      return 5000; // Effectively unlimited burst for admins
    }
    if (req.user) {
      return 120; // 120 requests per minute for authenticated users
    }
    return 200; // 200 requests per minute for anonymous users (increased for site functionality)
  },
  message: {
    error: 'Making requests too quickly, please slow down.'
  },
  standardHeaders: false, // Don't add extra headers
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    if (req.user?.id) {
      return `burst_user_${req.user.id}`;
    }
    return `burst_${azureKeyGenerator(req)}`;
  },
  // Skip rate limiting for health check endpoints and admins
  skip: (req: any) => {
    // Skip for admins
    if (req.user?.isAdmin) {
      return true;
    }
    // Skip for health check endpoints
    const path = req.path || req.url;
    return path === '/health' || 
           path === '/health/database' || 
           path === '/health/deployment' ||
           path.startsWith('/api/health');
  }
});

// Strict rate limiting for posting content
export const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 posts per 15 minutes
  message: {
    error: 'Too many posts created, please wait before posting again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator
});

// Rate limiting for messaging
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 messages per minute
  message: {
    error: 'Too many messages sent, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator
});

// Reasonable rate limiting for email/phone verification
export const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (much more reasonable than 15)
  max: 10, // 10 verification attempts per 5 minutes
  message: {
    error: 'Too many verification attempts, please wait a few minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator
});