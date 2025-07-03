const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const responseHandler = require('./utils/response-handler');
const authMiddleware = require('./middleware/auth');
const rateLimitMiddleware = require('./middleware/rate-limit');
const proxyRoutingMiddleware = require('./middleware/proxy-routing');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security and CORS
app.use(helmet({
  // SECURITY: Enhanced security headers
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for proxy functionality
}));

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://claude.ai'];
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
}));

// Middleware stack - SECURITY: Reduced JSON limit to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(authMiddleware);
app.use(rateLimitMiddleware);
app.use(proxyRoutingMiddleware);

// Dynamically load service modules
const modules = {};
const modulesDir = path.join(__dirname, 'modules');

if (fs.existsSync(modulesDir)) {
  fs.readdirSync(modulesDir)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
      const moduleName = file.replace('.js', '');
      try {
        modules[moduleName] = require(`./modules/${file}`);
        logger.info(`Loaded module: ${moduleName}`);
      } catch (error) {
        logger.error(`Failed to load module ${moduleName}:`, error);
      }
    });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Universal Proxy',
    modules: Object.keys(modules),
    uptime: process.uptime()
  });
});

// List available services
app.get('/api/services', (req, res) => {
  const services = Object.keys(modules).map(key => ({
    name: key,
    description: modules[key].description || 'No description',
    endpoints: modules[key].endpoints || []
  }));
  
  res.json({ services });
});

// Dynamic service routing
app.use('/api/:service/*', async (req, res) => {
  const { service } = req.params;
  const endpoint = req.params[0];
  
  if (!modules[service]) {
    return responseHandler.error(res, 404, `Service '${service}' not found`);
  }

  try {
    const result = await modules[service].handler(endpoint, req, res);
    if (!res.headersSent) {
      responseHandler.success(res, result);
    }
  } catch (error) {
    logger.error(`Service ${service} error:`, error);
    if (!res.headersSent) {
      responseHandler.error(res, 500, `Service ${service} failed: ${error.message}`);
    }
  }
});

// Generic HTTP proxy endpoint
app.all('/proxy/*', async (req, res) => {
  if (!modules['generic-http']) {
    return responseHandler.error(res, 503, 'Generic HTTP proxy module not available');
  }
  
  try {
    const result = await modules['generic-http'].handler('proxy', req, res);
    if (!res.headersSent) {
      responseHandler.success(res, result);
    }
  } catch (error) {
    logger.error('Generic proxy error:', error);
    if (!res.headersSent) {
      responseHandler.error(res, 500, `Proxy failed: ${error.message}`);
    }
  }
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  if (!res.headersSent) {
    responseHandler.error(res, 500, 'Internal server error');
  }
});

// 404 handler
app.use('*', (req, res) => {
  responseHandler.error(res, 404, 'Endpoint not found');
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Universal Proxy server running on port ${PORT}`);
  logger.info(`🔒 CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'localhost + claude.ai'}`);
  logger.info(`🌍 Health check: http://localhost:${PORT}/health`);
  logger.info(`📋 Services: http://localhost:${PORT}/api/services`);
});