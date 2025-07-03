# Universal Proxy Server

A modular, extensible proxy server with advanced bot detection bypass, secure credential management, and built-in support for residential proxies. Features a plugin architecture for easy service integration.

## 🚀 Core Features

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
curl -X POST http://localhost:3001/api/playwright-scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "stealth": true}'

# Take screenshot
curl -X POST http://localhost:3001/api/playwright-scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "output": "screenshot", "fullPage": true}' \
  --output screenshot.png

# Generate PDF
curl -X POST http://localhost:3001/api/playwright-scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "output": "pdf"}' \
  --output document.pdf

# Extract cookies for n8n automation
curl -X POST http://localhost:3001/api/playwright-scraper/scrape \
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

### Example Module: OpenAI

Proxy for OpenAI API services (requires OpenAI API key):

```bash
# Chat completion
curl -X POST http://localhost:3001/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'

# Text completion
curl -X POST http://localhost:3001/api/openai/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-davinci-003",
    "prompt": "Once upon a time",
    "max_tokens": 50
  }'

# Embeddings
curl -X POST http://localhost:3001/api/openai/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "Hello world"
  }'
```

### Example Module: Google Imagen

AI-powered image generation using Google's Imagen (requires Google API key):

```bash
# Generate image from text prompt
curl -X POST http://localhost:3001/api/google-imagen/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape with a crystal clear lake",
    "size": "1024x1024",
    "numberOfImages": 1,
    "quality": "hd",
    "style": "natural"
  }'

# List available models
curl http://localhost:3001/api/google-imagen/models
```

**Supported Features**: Multiple image sizes, quality settings, style control, and content filtering

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

# OpenAI (for openai module)
OPENAI_API_KEY=your_openai_key_here

# Google AI (for google-imagen module)
GOOGLE_API_KEY=your_google_api_key_here

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
- **AWS Polly TTS**: 50 requests per 15 minutes
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
4. Test thoroughly
5. Submit a pull request

The modular architecture makes it easy to contribute new service integrations!