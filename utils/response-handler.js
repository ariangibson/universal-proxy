const logger = require('./logger');

const responseHandler = {
  success: (res, data, status = 200) => {
    res.status(status).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  },

  error: (res, status, message, details = null) => {
    // SECURITY: Sanitize error messages to prevent information disclosure
    const sanitizedMessage = responseHandler.sanitizeErrorMessage(message, status);
    
    const errorResponse = {
      success: false,
      error: sanitizedMessage,
      timestamp: new Date().toISOString()
    };

    // SECURITY: Only include details in development mode
    if (details && process.env.NODE_ENV === 'development') {
      errorResponse.details = details;
    }

    // Log full error internally but send sanitized version to client
    logger.error(`Error ${status}: ${message}`, details);
    res.status(status).json(errorResponse);
  },

  // SECURITY: Sanitize error messages to prevent information disclosure
  sanitizeErrorMessage: (message, status) => {
    // In production, provide generic messages for certain error types
    if (process.env.NODE_ENV === 'production') {
      if (status >= 500) {
        return 'Internal server error';
      }
      
      // Remove potentially sensitive information from error messages
      const sensitivePatterns = [
        /ECONNREFUSED.*:\d+/gi,
        /getaddrinfo ENOTFOUND .*/gi,
        /connect ETIMEDOUT .*/gi,
        /socket hang up/gi,
        /certificate/gi,
        /ssl/gi,
        /path.*not found/gi
      ];
      
      let sanitized = message;
      sensitivePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, 'Connection error');
      });
      
      return sanitized;
    }
    
    return message; // In development, show full errors
  },

  stream: (res, stream, contentType = 'application/octet-stream') => {
    res.set('Content-Type', contentType);
    stream.pipe(res);
  }
};

module.exports = responseHandler;