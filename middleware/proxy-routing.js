const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');
const proxyConfig = require('../config/proxy');
const logger = require('../utils/logger');

const createProxyAgent = (proxyType = 'residential') => {
  const config = proxyConfig[proxyType];
  if (!config) {
    throw new Error(`Proxy type '${proxyType}' not configured`);
  }

  // Validate required proxy configuration
  if (!config.host || !config.username || !config.password) {
    throw new Error(`Incomplete proxy configuration for '${proxyType}'. Missing host, username, or password.`);
  }

  const proxyUrl = `${config.protocol}://${config.username}:${config.password}@${config.host}:${config.port}`;
  
  return config.protocol === 'https'
    ? new HttpsProxyAgent(proxyUrl)
    : new HttpProxyAgent(proxyUrl);
};

const setupProxyRouting = (req, res, next) => {
  // Check if request wants proxy routing
  const useProxy = req.headers['x-use-proxy'] || req.query.proxy;
  const proxyType = req.headers['x-proxy-type'] || req.query.proxy_type || 'residential';

  if (useProxy === 'true' || useProxy === '1') {
    try {
      req.proxyAgent = createProxyAgent(proxyType);
      req.proxyType = proxyType;
      logger.info(`Request routed through ${proxyType} proxy`);
    } catch (error) {
      logger.error('Proxy setup failed:', error);
      // Continue without proxy
    }
  }

  next();
};

module.exports = setupProxyRouting;