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
    // In production, hide internal errors
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      return 'Internal server error';
    }
    return message;
  },

  stream: (res, stream, contentType = 'application/octet-stream') => {
    res.set('Content-Type', contentType);
    stream.pipe(res);
  }
};

module.exports = responseHandler;