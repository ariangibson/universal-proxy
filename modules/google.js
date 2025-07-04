const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const googleModule = {
  description: 'Google AI services with dynamic model listing, Gemini chat completions and image generation',
  endpoints: ['chat', 'models', 'images'],

  _getGenAIInstance() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }
    return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  },

  async handler(endpoint, req, res) {
    switch (endpoint) {
      case 'chat':
        return await this.chatCompletion(req, res);
      case 'models':
        return await this.listModels(req, res);
      case 'images':
        return await this.generateImage(req, res);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  },

  async chatCompletion(req, res) {
    const {
      messages,
      model = 'gemini-2.5-flash', // Updated to Gemini 2.5 Flash
      maxTokens = 1000,
      temperature = 0.7,
      topP = 0.9,
      topK = 40
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages are required and must be a non-empty array');
    }

    try {
      const genAI = this._getGenAIInstance();
      const geminiModel = genAI.getGenerativeModel({ 
        model: model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
          topP: topP,
          topK: topK,
        }
      });

      // Convert messages to Gemini format
      const history = [];
      const lastMessage = messages[messages.length - 1];
      
      // Process all messages except the last one as history
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        history.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }

      // Start chat with history
      const chat = geminiModel.startChat({
        history: history
      });

      // Send the last message
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      return {
        model: model,
        choices: [{
          message: {
            role: 'assistant',
            content: text,
          },
          index: 0,
          finish_reason: 'stop'
        }],
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount,
          completionTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Google Gemini chatCompletion error: ${error.message}`);
      throw new Error(`Chat completion failed: ${error.message}`);
    }
  },

  async listModels(req, res) {
    try {
      const genAI = this._getGenAIInstance();
      
      // Try to fetch real models from Google AI API
      try {
        const response = await genAI.listModels();
        
        // Handle the response structure
        const models = response || [];
        
        const filteredModels = models
          .filter(model => {
            // Include only generative models (exclude embedding models for now)
            return model.name && (model.name.includes('gemini') || model.name.includes('models/'));
          })
          .map(model => ({
            id: model.name.replace('models/', ''), // Remove 'models/' prefix
            name: model.displayName || model.name,
            description: model.description || this._getModelDescription(model.name),
            version: model.version,
            inputTokenLimit: model.inputTokenLimit,
            outputTokenLimit: model.outputTokenLimit,
            supportedGenerationMethods: model.supportedGenerationMethods
          }))
          .sort((a, b) => {
            // Sort by version/name to get newer models first
            if (a.id.includes('2.5') && !b.id.includes('2.5')) return -1;
            if (!a.id.includes('2.5') && b.id.includes('2.5')) return 1;
            if (a.id.includes('2.0') && !b.id.includes('2.0')) return -1;
            if (!a.id.includes('2.0') && b.id.includes('2.0')) return 1;
            if (a.id.includes('1.5') && !b.id.includes('1.5')) return -1;
            if (!a.id.includes('1.5') && b.id.includes('1.5')) return 1;
            return a.id.localeCompare(b.id);
          });

        if (filteredModels.length > 0) {
          return {
            models: filteredModels,
            count: filteredModels.length,
            timestamp: new Date().toISOString(),
            source: 'Google AI API'
          };
        }
      } catch (apiError) {
        logger.warn(`Google AI models API not available, using fallback: ${apiError.message}`);
      }
      
      // Fallback to known models if API doesn't return expected data or fails
      return {
        models: [
          {
            id: 'gemini-2.5-flash',
            name: 'Gemini 2.5 Flash',
            description: 'Latest Gemini model with enhanced speed and capabilities',
            supportedGenerationMethods: ['generateContent']
          },
          {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            description: 'Experimental Gemini model with improved speed and capabilities',
            supportedGenerationMethods: ['generateContent']
          },
          {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: 'Large context window, advanced reasoning capabilities',
            supportedGenerationMethods: ['generateContent']
          },
          {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            description: 'Fast and versatile for diverse tasks',
            supportedGenerationMethods: ['generateContent']
          }
        ],
        count: 4,
        timestamp: new Date().toISOString(),
        source: 'Google AI Fallback (API not available)'
      };
    } catch (error) {
      logger.error(`Google AI listModels error: ${error.message}`);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  },

  // Helper to provide descriptions for known model types
  _getModelDescription(modelName) {
    const name = modelName.toLowerCase();
    if (name.includes('gemini-2.5')) return 'Latest Gemini model with enhanced speed and capabilities';
    if (name.includes('gemini-2.0')) return 'Advanced Gemini model with multimodal capabilities';
    if (name.includes('gemini-1.5-pro')) return 'Large context window, advanced reasoning capabilities';
    if (name.includes('gemini-1.5-flash')) return 'Fast and versatile for diverse tasks';
    if (name.includes('gemini-pro')) return 'High-performance multimodal model';
    if (name.includes('gemini')) return 'Google\'s advanced AI model';
    return 'Google AI model';
  },

  async generateImage(req, res) {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }

    // Validate required fields
    if (!req.body.prompt || typeof req.body.prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    const {
      prompt,
      model = 'gemini-2.0-flash-preview-image-generation', // Updated to Google's image generation model
      n = 1,
      size = '1024x1024'
    } = req.body;

    // Note: This is a placeholder for when Google releases image generation capabilities
    // Currently Google Gemini can analyze images but not generate them
    try {
      const genAI = this._getGenAIInstance();
      
      // For now, we'll throw an informative error about image generation
      // When Google releases image generation, this can be updated
      throw new Error(`Google Gemini image generation with model '${model}' is not yet available. Please use OpenAI or xAI for image generation. Google Gemini can analyze images sent via the chat endpoint.`);
      
    } catch (error) {
      logger.error(`Google image generation error: ${error.message}`);
      throw error;
    }
  }
};

module.exports = googleModule;
