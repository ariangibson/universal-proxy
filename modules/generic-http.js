const axios = require('axios');
const logger = require('../utils/logger');

const genericHttpModule = {
  description: 'Generic HTTP proxy for any REST API',
  endpoints: ['proxy'],

  async handler(endpoint, req, res) {
    if (endpoint !== 'proxy') {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return await this.proxyRequest(req, res);
  },

  async proxyRequest(req, res) {
    // Extract target URL from query params or headers
    const targetUrl = req.headers['x-target-url'] || req.query.url;
    
    if (!targetUrl) {
      throw new Error('Target URL required (use x-target-url header or url query param)');
    }

    // Validate and sanitize URL - CRITICAL SECURITY: Prevent SSRF attacks
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      throw new Error('Invalid target URL format');
    }

    // SECURITY: Block dangerous protocols and internal networks
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }

    // SECURITY: Block private/internal IP ranges to prevent SSRF
    const hostname = parsedUrl.hostname.toLowerCase();
    if (this.isPrivateOrLocalHost(hostname)) {
      throw new Error('Access to private/internal networks is not allowed');
    }

    // SECURITY: Block known dangerous domains
    const blockedDomains = ['169.254.169.254', 'metadata.google.internal', 'metadata'];
    if (blockedDomains.some(domain => hostname.includes(domain))) {
      throw new Error('Access to metadata services is not allowed');
    }

    // Prepare request config
    const config = {
      method: req.method,
      url: targetUrl,
      headers: { ...req.headers },
      timeout: 15000, // SECURITY: Reduced timeout to prevent resource exhaustion
      maxRedirects: 3, // SECURITY: Limit redirects to prevent redirect loops
      maxContentLength: 10 * 1024 * 1024, // SECURITY: 10MB limit
      maxBodyLength: 10 * 1024 * 1024, // SECURITY: 10MB limit
    };

    // Remove proxy-specific headers and sensitive data
    delete config.headers['x-target-url'];
    delete config.headers['x-use-proxy'];
    delete config.headers['x-proxy-type'];
    delete config.headers['x-api-key'];
    delete config.headers.host;
    delete config.headers.connection;
    delete config.headers['transfer-encoding'];
    delete config.headers['content-encoding'];

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.body) {
      config.data = req.body;
    }

    // Add proxy agent if configured
    if (req.proxyAgent) {
      config.httpsAgent = req.proxyAgent;
      config.httpAgent = req.proxyAgent;
      logger.info(`Proxying ${req.method} ${targetUrl} through ${req.proxyType}`);
    } else {
      logger.info(`Direct request: ${req.method} ${targetUrl}`);
    }

    try {
      const response = await axios(config);

      // Forward response headers (selective)
      const allowedHeaders = [
        'content-type', 'content-length', 'cache-control', 
        'expires', 'last-modified', 'etag'
      ];
      
      allowedHeaders.forEach(header => {
        if (response.headers[header]) {
          res.set(header, response.headers[header]);
        }
      });

      // Send response
      res.status(response.status);
      
      if (response.headers['content-type']?.includes('application/json')) {
        res.json(response.data);
      } else {
        res.send(response.data);
      }

      return null; // Response already sent

    } catch (error) {
      if (error.response) {
        // Forward API errors
        res.status(error.response.status);
        res.json(error.response.data);
        return null;
      } else {
        throw new Error(`Proxy request failed: ${error.message}`);
      }
    }
  },

  // SECURITY: Helper function to detect private/internal networks
  isPrivateOrLocalHost(hostname) {
    // localhost variations
    if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname.startsWith('127.')) {
      return true;
    }

    // IPv6 localhost
    if (hostname === '::1' || hostname === '::' || hostname.startsWith('fe80:')) {
      return true;
    }

    // Private IPv4 ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
      return (a === 10) ||
             (a === 172 && b >= 16 && b <= 31) ||
             (a === 192 && b === 168) ||
             (a === 169 && b === 254);
    }

    // Internal domain patterns
    const internalPatterns = [
      'internal', 'local', 'corp', 'intranet', 'private',
      '.internal.', '.local.', '.corp.', '.intranet.', '.private.'
    ];
    return internalPatterns.some(pattern => hostname.includes(pattern));
  }
};

module.exports = genericHttpModule;