const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");
const logger = require('../utils/logger');

// Memoized client for environment-based API key
const elevenlabs = process.env.ELEVENLABS_API_KEY
    ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
    : null;

const elevenLabsModule = {
    description: 'ElevenLabs Text-to-Speech service',
    endpoints: ['tts'],

    async handler(endpoint, req, res) {
        if (endpoint !== 'tts') {
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }
        return await this.tts(req, res);
    },
    async tts(req, res) {
        const { text, voice_id, model_id, elevenlabs_api_key } = req.body;

        if (!text || !voice_id) {
            throw new Error('Missing required parameters: text and voice_id');
        }

        const apiKey = elevenlabs_api_key || process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            throw new Error('Missing ElevenLabs API key. Provide it in the request body or set ELEVENLABS_API_KEY environment variable.');
        }

        try {
            // Use the memoized client if the API key from environment is used, otherwise create a new client
            const client = (apiKey === process.env.ELEVENLABS_API_KEY && elevenlabs)
                ? elevenlabs
                : new ElevenLabsClient({ apiKey: apiKey });

            const audio = await client.textToSpeech.convert(voice_id, {
                text: text,
                model_id: model_id || "eleven_multilingual_v2",
            });

            // For the proxy response handler, we return audio data
            // The response handler will take care of streaming it properly
            return {
                contentType: 'audio/mpeg',
                data: audio,
                isStream: true
            };

        } catch (error) {
            logger.error(`ElevenLabs API error: ${error.message}`);
            throw new Error(`Error generating audio from ElevenLabs: ${error.message}`);
        }
    }
};

module.exports = elevenLabsModule;
