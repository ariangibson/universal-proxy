const axios = require('axios');
const logger = require('../utils/logger');

const xaiModule = {
  description: 'xAI API proxy with dynamic model listing, Grok chat completions, live search, and image generation',
  endpoints: ['chat', 'models', 'images'],

  _getAPIKey(req, credentials) {
    const { xai_api_key } = req.body;
    const apiKey = xai_api_key || (credentials && credentials.xai_api_key) || process.env.XAI_API_KEY;

    if (!apiKey) {
      throw new Error('xAI API key not configured. Please set XAI_API_KEY environment variable or provide it in the request body.');
    }

    return apiKey;
  },

  async handler(endpoint, req, res, credentials) {
    switch (endpoint) {
      case 'chat':
        return await this.chatCompletion(req, res, credentials);
      case 'models':
        return await this.listModels(req, res, credentials);
      case 'images':
        return await this.generateImages(req, res, credentials);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  },

  async chatCompletion(req, res, credentials) {
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      throw new Error('Messages array is required');
    }

    try {
      const apiKey = this._getAPIKey(req, credentials);
      
      // Extract xAI-specific parameters
      const {
        messages,
        model = 'grok-3-mini', // Updated to grok-3-mini for better efficiency
        max_tokens = 4000,
        temperature = 0.7,
        top_p = 0.9,
        stream = false,
        // xAI-specific: Live Search capability
        enable_live_search = false,
        search_recency_filter = 'auto', // 'auto', 'day', 'week', 'month', 'year'
        // Function calling support
        tools = null,
        tool_choice = 'auto'
      } = req.body;

      const requestBody = {
        model,
        messages,
        max_tokens,
        temperature,
        top_p,
        stream
      };

      // Add live search configuration if enabled
      if (enable_live_search) {
        requestBody.enable_live_search = true;
        requestBody.search_recency_filter = search_recency_filter;
        logger.info(`xAI request with live search enabled (recency: ${search_recency_filter})`);
      }

      // Add function calling if tools are provided
      if (tools && Array.isArray(tools)) {
        requestBody.tools = tools;
        requestBody.tool_choice = tool_choice;
      }

      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Universal-Proxy/1.0'
      };

      // Add proxy support if available
      const axiosConfig = {
        method: 'POST',
        url: 'https://api.x.ai/v1/chat/completions',
        headers,
        data: requestBody,
        timeout: 60000 // 60 second timeout for live search
      };

      if (req.proxyAgent) {
        axiosConfig.httpsAgent = req.proxyAgent;
        logger.info(`xAI request through ${req.proxyType} proxy`);
      }

      const response = await axios(axiosConfig);
      
      // Log successful live search usage
      if (enable_live_search && response.data.choices?.[0]?.message?.content) {
        logger.info('xAI live search completed successfully');
      }

      return response.data;

    } catch (error) {
      if (error.response) {
        // xAI API error - set response and throw for consistent error handling
        logger.error(`xAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        res.status(error.response.status);
        res.json(error.response.data);
        throw new Error(`xAI API error: ${error.response.status}`);
      }
      logger.error(`xAI request error: ${error.message}`);
      throw new Error(`xAI request failed: ${error.message}`);
    }
  },

  async generateImages(req, res, credentials) {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    // Validate required fields
    if (!req.body.prompt || typeof req.body.prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    // Validate prompt length
    if (req.body.prompt.length > 4000) {
      throw new Error('Prompt too long (max 4000 characters)');
    }

    const {
      prompt,
      model = 'grok-2-image-1212',
      n = 1,
      size = '1024x1024'
    } = req.body;

    // Validate model
    const allowedModels = ['grok-2-image-1212'];
    if (!allowedModels.includes(model)) {
      throw new Error('Invalid model. Use grok-2-image-1212');
    }

    // Validate number of images (Grok supports multiple images)
    if (n < 1 || n > 4) {
      throw new Error('Number of images must be between 1 and 4');
    }

    // Validate size
    const allowedSizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!allowedSizes.includes(size)) {
      throw new Error(`Invalid size. Allowed: ${allowedSizes.join(', ')}`);
    }

    try {
      const apiKey = this._getAPIKey(req, credentials);

      const requestBody = {
        prompt,
        model
      };

      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Universal-Proxy/1.0'
      };

      const axiosConfig = {
        method: 'POST',
        url: 'https://api.x.ai/v1/images/generations',
        headers,
        data: requestBody,
        timeout: 120000 // 2 minute timeout for image generation
      };

      if (req.proxyAgent) {
        axiosConfig.httpsAgent = req.proxyAgent;
        logger.info(`xAI image request through ${req.proxyType} proxy`);
      }

      logger.info(`${model} image generation: ${prompt.substring(0, 50)}...`);
      const response = await axios(axiosConfig);

      return response.data;

    } catch (error) {
      if (error.response) {
        // xAI Images API error - set response and throw for consistent error handling
        logger.error(`xAI Images API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        res.status(error.response.status);
        res.json(error.response.data);
        throw new Error(`xAI Images API error: ${error.response.status}`);
      }
      logger.error(`xAI images request error: ${error.message}`);
      throw new Error(`xAI image generation failed: ${error.message}`);
    }
  },

  async listModels(req, res, credentials) {
    try {
      const apiKey = this._getAPIKey(req, credentials);
      
      // Try to fetch real models from xAI API
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Universal-Proxy/1.0'
      };

      const axiosConfig = {
        method: 'GET',
        url: 'https://api.x.ai/v1/models',
        headers,
        timeout: 10000
      };

      if (req.proxyAgent) {
        axiosConfig.httpsAgent = req.proxyAgent;
      }

      try {
        const response = await axios(axiosConfig);
        
        // Format the response to match our standard
        const models = response.data.data || response.data.models || [];
        
        return {
          models: models.map(model => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description || this._getModelDescription(model.id),
            context_window: model.context_window || model.max_tokens,
            capabilities: this._getModelCapabilities(model.id),
            created: model.created,
            owned_by: model.owned_by || 'xAI'
          })),
          count: models.length,
          timestamp: new Date().toISOString(),
          source: 'xAI API'
        };
      } catch (apiError) {
        // If the API doesn't support model listing, fall back to known models
        logger.warn(`xAI models API not available, using fallback: ${apiError.message}`);
        
        return {
          models: [
            {
              id: 'grok-3',
              name: 'Grok 3',
              description: 'Latest flagship model with enhanced reasoning and live search capabilities',
              context_window: 131072,
              capabilities: ['text', 'live_search', 'function_calling', 'structured_outputs'],
              owned_by: 'xAI'
            },
            {
              id: 'grok-3-mini',
              name: 'Grok 3 Mini',
              description: 'Efficient model optimized for speed and reasoning tasks',
              context_window: 131072,
              capabilities: ['text', 'reasoning'],
              owned_by: 'xAI'
            },
            {
              id: 'grok-2-vision-1212',
              name: 'Grok 2 Vision',
              description: 'Multimodal model for document and image understanding',
              context_window: 8192,
              capabilities: ['text', 'vision', 'image_understanding'],
              owned_by: 'xAI'
            },
            {
              id: 'grok-2-image-1212',
              name: 'Aurora (Grok 2 Image)',
              description: 'Advanced image generation model with photorealistic capabilities',
              capabilities: ['image_generation'],
              owned_by: 'xAI'
            }
          ],
          count: 4,
          timestamp: new Date().toISOString(),
          source: 'xAI Fallback (API not available)',
          features: {
            live_search: {
              description: 'Real-time web search integration',
              recency_filters: ['auto', 'day', 'week', 'month', 'year'],
              note: 'Enable with enable_live_search: true parameter'
            },
            function_calling: {
              description: 'Tool use and function calling capabilities',
              compatible_models: ['grok-3-beta']
            },
            structured_outputs: {
              description: 'Organized, predictable response formats',
              compatible_models: ['grok-3-beta']
            }
          }
        };
      }
    } catch (error) {
      logger.error(`xAI listModels error: ${error.message}`);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  },

  // Helper to provide descriptions for known model types
  _getModelDescription(modelId) {
    if (modelId.includes('grok-3') && modelId.includes('beta')) return 'Latest Grok model with enhanced reasoning and live search';
    if (modelId.includes('grok-3-mini')) return 'Efficient Grok model optimized for speed and reasoning';
    if (modelId.includes('grok-2-vision')) return 'Multimodal Grok model for vision and document understanding';
    if (modelId.includes('grok-2-image') || modelId.includes('aurora')) return 'Advanced image generation model';
    if (modelId.includes('grok')) return 'xAI Grok language model';
    return 'xAI model';
  },

  // Helper to determine model capabilities
  _getModelCapabilities(modelId) {
    const capabilities = ['text'];
    
    if (modelId.includes('grok-3-beta')) {
      capabilities.push('live_search', 'function_calling', 'structured_outputs');
    }
    if (modelId.includes('grok-3-mini')) {
      capabilities.push('reasoning');
    }
    if (modelId.includes('vision')) {
      capabilities.push('vision', 'image_understanding');
    }
    if (modelId.includes('image') || modelId.includes('aurora')) {
      return ['image_generation'];
    }
    
    return capabilities;
  }
};

module.exports = xaiModule;
