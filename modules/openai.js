const OpenAI = require('openai');
const logger = require('../utils/logger');

// Memoized client for environment-based API key
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const openaiModule = {
  description: 'OpenAI API proxy with dynamic model listing, chat completions, and image generation',
  endpoints: ['chat', 'images', 'models'],

  _getOpenAIClient(req, credentials) {
    const { openai_api_key } = req.body;
    const apiKey = openai_api_key || (credentials && credentials.openai_api_key) || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable or provide it in the request body.');
    }

    // Use memoized client if possible, otherwise create a new one
    if (apiKey === process.env.OPENAI_API_KEY && openai) {
      return openai;
    }
    return new OpenAI({ apiKey });
  },

  async handler(endpoint, req, res, credentials) {
    switch (endpoint) {
      case 'chat':
        return await this.chatCompletion(req, res, credentials);
      case 'images':
        return await this.generateImages(req, res, credentials);
      case 'models':
        return await this.listModels(req, res, credentials);
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
      const client = this._getOpenAIClient(req, credentials);
      const body = {
        ...req.body,
        model: req.body.model || 'gpt-4o-mini', // Updated to gpt-4o-mini for better availability
      };
      
      const options = {};
      if (req.proxyAgent) {
        options.fetchOptions = { dispatcher: req.proxyAgent };
        logger.info(`OpenAI request through ${req.proxyType} proxy`);
      }

      const completion = await client.chat.completions.create(body, options);
      return completion;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        res.status(error.status);
        res.json(error.error);
        return null;
      }
      throw error;
    }
  },

  async generateImages(req, res, credentials) {
    // SECURITY: Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    // SECURITY: Validate required fields
    if (!req.body.prompt || typeof req.body.prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    // SECURITY: Validate prompt length
    if (req.body.prompt.length > 4000) {
      throw new Error('Prompt too long (max 4000 characters)');
    }

    // SECURITY: Validate optional parameters
    const {
      prompt,
      model = 'gpt-image-1', // Updated to latest image model
      n = 1,
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid'
    } = req.body;

    // SECURITY: Validate model
    const allowedModels = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];
    if (!allowedModels.includes(model)) {
      throw new Error('Invalid model. Use gpt-image-1, dall-e-3, or dall-e-2');
    }

    // SECURITY: Validate number of images
    if ((model === 'dall-e-3' || model === 'gpt-image-1') && n !== 1) {
      throw new Error(`${model} only supports generating 1 image at a time`);
    }
    if (model === 'dall-e-2' && (n < 1 || n > 10)) {
      throw new Error('DALL-E 2 supports 1-10 images');
    }

    // SECURITY: Validate size
    let allowedSizes;
    if (model === 'dall-e-3' || model === 'gpt-image-1') {
      allowedSizes = ['1024x1024', '1024x1792', '1792x1024'];
    } else {
      allowedSizes = ['256x256', '512x512', '1024x1024'];
    }
    if (!allowedSizes.includes(size)) {
      throw new Error(`Invalid size for ${model}. Allowed: ${allowedSizes.join(', ')}`);
    }

    // SECURITY: Validate quality (DALL-E 3 and gpt-image-1)
    if ((model === 'dall-e-3' || model === 'gpt-image-1') && !['standard', 'hd'].includes(quality)) {
      throw new Error(`Quality must be standard or hd for ${model}`);
    }

    // SECURITY: Validate style (DALL-E 3 and gpt-image-1)
    if ((model === 'dall-e-3' || model === 'gpt-image-1') && !['vivid', 'natural'].includes(style)) {
      throw new Error(`Style must be vivid or natural for ${model}`);
    }

    const requestData = {
      prompt,
      model,
      n,
      size,
      response_format: 'url'
    };

    // Add model-specific parameters for DALL-E 3 and gpt-image-1
    if (model === 'dall-e-3' || model === 'gpt-image-1') {
      requestData.quality = quality;
      requestData.style = style;
    }

    try {
      const client = this._getOpenAIClient(req, credentials);
      logger.info(`${model} image generation: ${prompt.substring(0, 50)}...`);
      
      const options = {};
      if (req.proxyAgent) {
        options.fetchOptions = { dispatcher: req.proxyAgent };
        logger.info(`OpenAI image request through ${req.proxyType} proxy`);
      }

      const response = await client.images.generate(requestData, options);
      return response;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        res.status(error.status);
        res.json(error.error);
        return null;
      }
      throw error;
    }
  },

  async listModels(req, res, credentials) {
    try {
      const client = this._getOpenAIClient(req, credentials);
      
      // Fetch real models from OpenAI API
      const response = await client.models.list();
      
      // Filter and format models for useful display
      const models = response.data
        .filter(model => {
          // Include chat models, image models, and other useful ones
          return model.id.includes('gpt') || 
                 model.id.includes('dall-e') || 
                 model.id.includes('whisper') ||
                 model.id.includes('tts') ||
                 model.id.includes('embedding');
        })
        .map(model => ({
          id: model.id,
          name: model.id,
          description: this._getModelDescription(model.id),
          owned_by: model.owned_by,
          created: model.created
        }))
        .sort((a, b) => b.created - a.created); // Most recent first

      return {
        models,
        count: models.length,
        timestamp: new Date().toISOString(),
        source: 'OpenAI API'
      };
    } catch (error) {
      logger.error(`OpenAI listModels error: ${error.message}`);
      throw new Error(`Failed to fetch models from OpenAI: ${error.message}`);
    }
  },

  // Helper to provide descriptions for known model types
  _getModelDescription(modelId) {
    if (modelId.includes('gpt-4o')) return 'Advanced GPT-4 model with vision and multimodal capabilities';
    if (modelId.includes('gpt-4-turbo')) return 'High-performance GPT-4 with improved speed and context';
    if (modelId.includes('gpt-4')) return 'Large multimodal model with broad general knowledge';
    if (modelId.includes('gpt-3.5-turbo')) return 'Fast and efficient chat model';
    if (modelId.includes('dall-e-3')) return 'Advanced image generation with improved quality and safety';
    if (modelId.includes('dall-e-2')) return 'Image generation model supporting multiple outputs';
    if (modelId.includes('whisper')) return 'Speech recognition and transcription model';
    if (modelId.includes('tts')) return 'Text-to-speech model';
    if (modelId.includes('embedding')) return 'Text embedding model for semantic search';
    return 'OpenAI model';
  }
};

module.exports = openaiModule;