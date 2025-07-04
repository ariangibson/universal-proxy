const rateLimit = require('express-rate-limit');

// Create rate limiters at module initialization
const ttsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'TTS rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

const proxyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Proxy rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

const playwrightRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Very limited due to resource usage
  message: { error: 'Browser scraping rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

const defaultRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: 'Rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting based on path
const rateLimitMiddleware = (req, res, next) => {
  // Skip rate limiting for public endpoints
  if (req.path === '/health' || req.path === '/api/services') {
    return next();
  }

  if (req.path.startsWith('/api/playwright')) {
    // Browser scraping is very resource intensive
    return playwrightRateLimit(req, res, next);
  } else if (req.path.startsWith('/api/aws-polly')) {
    // TTS is expensive, limit more aggressively
    return ttsRateLimit(req, res, next);
  } else if (req.path.startsWith('/proxy')) {
    // Generic proxy gets moderate limits
    return proxyRateLimit(req, res, next);
  } else {
    // Default rate limit
    return defaultRateLimit(req, res, next);
  }
};

module.exports = rateLimitMiddleware;