# Universal Proxy Server

A modular, extensible proxy server with AI/LLM integration, advanced bot detection bypass, and secure credential management. Features unified APIs for OpenAI, Google Gemini, xAI Grok, and browser automation.

## 🚀 Core Features

- **🤖 AI & LLM Integration**: OpenAI GPT, Google Gemini, xAI Grok with live search
- **🎭 Browser Automation**: Playwright-powered scraping with stealth mode
- **🌐 HTTP Proxy**: Generic proxying with residential proxy support  
- **🔒 Security-First**: SSRF protection, input validation, encrypted credentials
- **📦 Modular Architecture**: Easy to extend with custom service modules
- **⚡ Rate Limiting**: Configurable limits per service
- **🔑 Authentication**: API key-based security
- **📊 Monitoring**: Health checks and comprehensive logging
- **🐳 Docker Ready**: Containerized deployment support

## 🛠️ Quick Start

### Installation

```bash
git clone <repository-url>
cd universal-proxy
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Start Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server runs on `http://localhost:3001` by default.

## 🌐 Core Functionality

### Generic HTTP Proxy

Route any HTTP request through the proxy with optional residential proxy support:

```bash
# Simple proxy request
curl -X GET http://localhost:3001/proxy/anything \
  -H "x-target-url: https://api.github.com/users/octocat"

# Using residential proxy for enhanced privacy
curl -X GET http://localhost:3001/proxy/anything \
  -H "x-target-url: https://api.example.com/data" \
  -H "x-use-proxy: true" \
  -H "x-proxy-type: residential"
```

**Security**: Automatically blocks requests to private networks, localhost, and metadata services to prevent SSRF attacks.

### Playwright Browser Automation

Advanced browser-based scraping with bot detection bypass:

```bash
# Get HTML content
curl -X POST http://localhost:3001/api/playwright/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "stealth": true}'

# Take screenshot
curl -X POST http://localhost:3001/api/playwright/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "output": "screenshot", "fullPage": true}' \
  --output screenshot.png

# Generate PDF
curl -X POST http://localhost:3001/api/playwright/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "output": "pdf"}' \
  --output document.pdf

# Extract cookies for n8n automation
curl -X POST http://localhost:3001/api/playwright/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://secure-site.com", "output": "cookies", "autoLogin": true}'
```

**Stealth Features**: Modern user agents, WebDriver property removal, plugin mocking, multiple browser engines, and automatic login with encrypted credential storage.

## 📦 Module System

The Universal Proxy Server uses a modular architecture that makes it easy to add new service integrations.

### Creating a Module

Create a new file in the `modules/` directory with this template:

```javascript
// modules/your-service.js
const yourServiceModule = {
  description: 'Description of your service',
  endpoints: ['endpoint1', 'endpoint2'],

  async handler(endpoint, req, res) {
    switch (endpoint) {
      case 'endpoint1':
        return await this.handleEndpoint1(req, res);
      case 'endpoint2':
        return await this.handleEndpoint2(req, res);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  },

  async handleEndpoint1(req, res) {
    // Your implementation here
    return { message: 'Success' };
  },

  async handleEndpoint2(req, res) {
    // Your implementation here
    return { data: 'Your data' };
  }
};

module.exports = yourServiceModule;
```

The module will automatically be loaded and available at `/api/your-service/endpoint1` and `/api/your-service/endpoint2`.

### Example Module: AWS Polly

Text-to-speech service using AWS Polly (requires AWS credentials):

```bash
# Convert text to speech
curl -X POST http://localhost:3001/api/aws-polly/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world, this is a test of AWS Polly text-to-speech",
    "voiceId": "Joanna",
    "engine": "neural"
  }' \
  --output speech.mp3

# List available voices
curl http://localhost:3001/api/aws-polly/voices
```

**Supported Voices**: Joanna, Matthew, Ivy, Justin, Kendra, Kimberly, Salli, Joey, Amy, Brian, Emma

### Example Module: ElevenLabs

High-quality text-to-speech using ElevenLabs API (requires ElevenLabs API key):

```bash
# Convert text to speech with premium voices
curl -X POST http://localhost:3001/api/elevenlabs/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world, this is ElevenLabs premium text-to-speech",
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "model_id": "eleven_multilingual_v2"
  }' \
  --output speech.mp3

# Use custom API key for specific request
curl -X POST http://localhost:3001/api/elevenlabs/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Premium voice synthesis with ElevenLabs",
    "voice_id": "EXAVITQu4vr4xnSDxMaL",
    "elevenlabs_api_key": "your-elevenlabs-key"
  }' \
  --output premium_speech.mp3
```

**Features**: Premium voice cloning, multilingual support, emotional speech synthesis

### Example Module: Google Gemini

Advanced AI capabilities using Google's Gemini models (requires Google API key):

```bash
# Chat completion
curl -X POST http://localhost:3001/api/google/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain quantum computing simply"}
    ],
    "model": "gemini-2.0-flash-exp"
  }'

# Image generation with Imagen 3
curl -X POST http://localhost:3001/api/google/images \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic cityscape with flying cars at sunset",
    "model": "imagen-3.0-generate-001",
    "aspectRatio": "1:1"
  }'

# List available models
curl http://localhost:3001/api/google/models
```

**Features**: Latest Gemini 2.0 models, Imagen 3 image generation, function calling support

### Example Module: OpenAI

Complete OpenAI API proxy with advanced AI capabilities (requires OpenAI API key):

```bash
# Chat completion
curl -X POST http://localhost:3001/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'

# Image generation with DALL-E 3
curl -X POST http://localhost:3001/api/openai/images \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic city with flying cars at sunset",
    "model": "dall-e-3",
    "size": "1024x1024",
    "quality": "hd",
    "style": "vivid"
  }'

# List available models
curl http://localhost:3001/api/openai/models

# Embeddings
curl -X POST http://localhost:3001/api/openai/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-large",
    "input": "Hello world"
  }'
```

**Features**: Latest GPT models, DALL-E 3 image generation, advanced embeddings, function calling

### Example Module: xAI (Grok)

Grok AI with live search and real-time information (requires xAI API key):

```bash
# Chat with Grok-3 Mini (efficient model, real-time search available)
curl -X POST http://localhost:3001/api/xai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-3-mini",
    "messages": [{"role": "user", "content": "What are the latest news about AI developments?"}],
    "max_tokens": 500
  }'

# Live search with specific recency filter (works with Grok-3 Beta)
curl -X POST http://localhost:3001/api/xai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-3-beta",
    "messages": [{"role": "user", "content": "What happened in tech today?"}],
    "enable_live_search": true,
    "search_recency_filter": "day"
  }'

# Image generation with Aurora
curl -X POST http://localhost:3001/api/xai/images \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at dawn",
    "model": "grok-2-image-1212"
  }'

# List available models
curl http://localhost:3001/api/xai/models
```

**Features**: Grok-3 Beta with live search, Grok-3 Mini for efficiency, Aurora image generation, real-time information, function calling support  
**Live Search Filters**: `auto`, `day`, `week`, `month`, `year` for different time ranges

## ⚙️ Configuration

### Environment Variables

Configure the server using environment variables in your `.env` file:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://claude.ai,http://localhost:3000

# API Keys (optional - comma-separated for multiple keys)
API_KEYS=your-secret-api-key

# AWS Credentials (for aws-polly module)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# ElevenLabs (for elevenlabs module)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# OpenAI (for openai module)
OPENAI_API_KEY=your_openai_key_here

# Google AI (for google module)
GOOGLE_API_KEY=your_google_api_key_here

# xAI (for xai module with Grok models and live search)
XAI_API_KEY=your_xai_api_key_here

# Residential Proxy Configuration
PROXY_RESIDENTIAL_HOST=your-residential-proxy-host.com
PROXY_RESIDENTIAL_PORT=10000
PROXY_RESIDENTIAL_USERNAME=your-residential-username
PROXY_RESIDENTIAL_PASSWORD=your-residential-password

# Datacenter Proxy Configuration (optional)
PROXY_DATACENTER_HOST=your-datacenter-proxy-host.com
PROXY_DATACENTER_PORT=8080
PROXY_DATACENTER_USERNAME=your-datacenter-username
PROXY_DATACENTER_PASSWORD=your-datacenter-password

# Credentials Encryption (for secure login storage)
CREDENTIALS_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### Rate Limits

Different endpoints have different rate limits:

- **Playwright Scraping**: 20 requests per 15 minutes (resource intensive)
- **AWS Polly & ElevenLabs TTS**: 50 requests per 15 minutes
- **AI Modules (OpenAI, Google, xAI)**: 100 requests per 15 minutes
- **Generic Proxy**: 200 requests per 15 minutes  
- **Other endpoints**: 1000 requests per 15 minutes

### Authentication

API keys are optional but recommended for production:

```bash
# All requests (when API keys are configured)
curl -H "x-api-key: your-api-key" http://localhost:3001/api/services

# Public endpoints (no key required)
curl http://localhost:3001/health
curl http://localhost:3001/api/services
```

## 🔒 Security Features

### Built-in Protection

- **SSRF Prevention**: Blocks requests to private networks and dangerous URLs
- **Input Validation**: Comprehensive sanitization of all inputs
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Secure Headers**: CSP, HSTS, and other security headers
- **Encrypted Storage**: AES-256-GCM for sensitive credentials
- **Error Sanitization**: Prevents information disclosure

### Blocked URLs

The proxy automatically blocks requests to:
- Private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Localhost and loopback addresses
- Metadata services (169.254.169.254, metadata.google.internal)
- Internal domains (.internal, .local, .corp, etc.)

## 🐳 Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
docker build -t universal-proxy .
docker run -p 3001:3001 --env-file .env universal-proxy
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

Response includes server status, loaded modules, and uptime.

### Service Discovery

```bash
curl http://localhost:3001/api/services
```

Lists all available modules and their endpoints.

## 🔧 Troubleshooting

### Common Issues

**Port already in use**: Change `PORT=3002` in `.env`

**Module loading errors**: Check that your module exports the correct structure and run `npm install`

**AI API errors**: Verify your API keys are correctly set in `.env` (OPENAI_API_KEY, GOOGLE_API_KEY, XAI_API_KEY, ELEVENLABS_API_KEY)

**Live search not working**: Ensure xAI API key is valid and has appropriate permissions for search features

**CORS errors**: Add your domain to `ALLOWED_ORIGINS` in `.env`

**Rate limiting**: Public endpoints (`/health`, `/api/services`) are exempt from rate limits

**Proxy blocks legitimate URLs**: The SSRF protection is intentionally strict. Use the generic proxy for external URLs only.

### Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check this README and code comments
- **Logs**: Check console output for detailed error messages

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your module or improvements
4. Test thoroughly with all endpoints
5. Submit a pull request

The modular architecture makes it easy to contribute new service integrations! When adding AI modules, follow OpenAI-style conventions for consistency.