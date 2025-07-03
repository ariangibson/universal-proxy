const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  // Skip auth for public endpoints
  if (req.path === '/health' || req.path === '/api/services') {
    return next();
  }

  // API key authentication (optional) - SECURITY: Only use header, not query params
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS?.split(',') || [];

  // If API keys are configured, require them
  if (validApiKeys.length > 0 && validApiKeys[0] !== '') {
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      logger.warn(`Unauthorized request from ${req.ip}: ${req.path}`);
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }
  }

  // Log request for monitoring - SECURITY: Don't log query params (may contain secrets)
  logger.info(`${req.method} ${req.path} from ${req.ip}`);
  next();
};

module.exports = authMiddleware;