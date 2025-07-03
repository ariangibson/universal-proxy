const axios = require('axios');
const logger = require('../utils/logger');

const openaiModule = {
  description: 'OpenAI API proxy with key management',
  endpoints: ['chat', 'completions', 'embeddings'],

  async handler(endpoint, req, res) {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    switch (endpoint) {
      case 'chat':
        return await this.chatCompletion(req, res);
      case 'completions':
        return await this.textCompletion(req, res);
      case 'embeddings':
        return await this.createEmbeddings(req, res);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  },

  async chatCompletion(req, res) {
    // SECURITY: Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    // SECURITY: Validate required fields
    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      throw new Error('Messages array is required');
    }

    const config = {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: req.body,
      timeout: 30000, // SECURITY: Reduced timeout
      maxContentLength: 10 * 1024 * 1024, // SECURITY: 10MB limit
      maxBodyLength: 10 * 1024 * 1024
    };

    // Add proxy if configured
    if (req.proxyAgent) {
      config.httpsAgent = req.proxyAgent;
      logger.info(`OpenAI request through ${req.proxyType} proxy`);
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        res.status(error.response.status);
        res.json(error.response.data);
        return null;
      }
      throw error;
    }
  },

  async textCompletion(req, res) {
    // SECURITY: Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    if (!req.body.prompt || typeof req.body.prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    const config = {
      method: 'POST',
      url: 'https://api.openai.com/v1/completions',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: req.body,
      timeout: 30000, // SECURITY: Reduced timeout
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024
    };

    // Add proxy if configured
    if (req.proxyAgent) {
      config.httpsAgent = req.proxyAgent;
      logger.info(`OpenAI completions request through ${req.proxyType} proxy`);
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        res.status(error.response.status);
        res.json(error.response.data);
        return null;
      }
      throw error;
    }
  },

  async createEmbeddings(req, res) {
    // SECURITY: Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    if (!req.body.input) {
      throw new Error('Input is required for embeddings');
    }

    const config = {
      method: 'POST',
      url: 'https://api.openai.com/v1/embeddings',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: req.body,
      timeout: 30000, // SECURITY: Reduced timeout
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024
    };

    // Add proxy if configured
    if (req.proxyAgent) {
      config.httpsAgent = req.proxyAgent;
      logger.info(`OpenAI embeddings request through ${req.proxyType} proxy`);
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        res.status(error.response.status);
        res.json(error.response.data);
        return null;
      }
      throw error;
    }
  }
};

module.exports = openaiModule;