const { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } = require('@aws-sdk/client-polly');
const logger = require('../utils/logger');

// Configure AWS Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const awsModule = {
  description: 'AWS AI services - Polly text-to-speech and voice synthesis',
  endpoints: ['tts', 'voices'],

  async handler(endpoint, req, res) {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }

    switch (endpoint) {
      case 'tts':
        return await this.synthesizeSpeech(req, res);
      case 'voices':
        return await this.listVoices(req, res);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  },

  async synthesizeSpeech(req, res) {
    const { text, voiceId = 'Joanna', engine = 'neural' } = req.body;

    // SECURITY: Input validation and sanitization
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text is required and must be a string');
    }

    if (text.length > 3000) {
      throw new Error('Text too long (max 3000 characters)');
    }

    // SECURITY: Sanitize voiceId to prevent injection
    const allowedVoices = [
      'Joanna', 'Matthew', 'Ivy', 'Justin', 'Kendra', 'Kimberly', 'Salli', 'Joey', 'Amy', 'Brian', 'Emma'
    ];
    if (!allowedVoices.includes(voiceId)) {
      throw new Error('Invalid voice ID');
    }

    // SECURITY: Validate engine parameter
    if (!['neural', 'standard'].includes(engine)) {
      throw new Error('Invalid engine type');
    }

    // SECURITY: Basic content filtering
    const prohibitedPatterns = [
      /<script/gi, /javascript:/gi, /data:/gi, /vbscript:/gi
    ];
    if (prohibitedPatterns.some(pattern => pattern.test(text))) {
      throw new Error('Text contains prohibited content');
    }

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceId,
      Engine: engine,
      SampleRate: '22050'
    });

    logger.info(`TTS Request: ${voiceId} - ${text.substring(0, 50)}...`);

    const result = await pollyClient.send(command);

    // Convert stream to buffer for response
    const chunks = [];
    for await (const chunk of result.AudioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Set headers and stream response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });

    res.send(audioBuffer);
    return null; // Response already sent
  },

  async listVoices() {
    const command = new DescribeVoicesCommand({});
    const result = await pollyClient.send(command);
    
    const voices = result.Voices
      .filter(voice => voice.SupportedEngines.includes('neural'))
      .map(voice => ({
        id: voice.Id,
        name: voice.Name,
        language: voice.LanguageName,
        gender: voice.Gender
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { voices };
  }
};

module.exports = awsModule;