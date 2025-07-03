# Universal Proxy Server

A modular, high-performance proxy server with support for multiple services including AWS Polly, OpenAI, and generic HTTP proxying. Features residential proxy support, rate limiting, authentication, and comprehensive logging.

## 🚀 Features

- **Modular Architecture**: Easy to extend with new service modules
- **Residential Proxy Support**: Built-in proxy routing for enhanced privacy
- **Rate Limiting**: Configurable rate limits per service
- **Authentication**: API key-based security
- **Comprehensive Logging**: Winston-based logging with multiple levels
- **Health Monitoring**: Built-in health checks and service discovery
- **Docker Support**: Ready for containerized deployment

## 📁 Project Structure

```
universal-proxy/
├── Dockerfile
├── package.json
├── server.js
├── docker-compose.yml
├── .env.example
├── config/
│   └── proxy.js
├── modules/
│   ├── aws-polly.js

│   ├── openai.js
│   └── generic-http.js
├── middleware/
│   ├── auth.js
│   ├── rate-limit.js
│   └── proxy-routing.js
└── utils/
    ├── logger.js
    └── response-handler.js
```

## 🛠️ Installation

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd universal-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

2. Or build manually:
```bash
docker build -t universal-proxy .
docker run -p 3001:3001 --env-file .env universal-proxy
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://claude.ai,http://localhost:3000,https://yourdomain.com

# API Keys (optional - comma-separated for multiple keys)
API_KEYS=your-secret-api-key,another-api-key

# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# OpenAI (if using OpenAI module)
OPENAI_API_KEY=your_openai_key_here

# Residential Proxy Configuration
PROXY_RESIDENTIAL_HOST=your-residential-proxy-host.com
PROXY_RESIDENTIAL_PORT=10000
PROXY_RESIDENTIAL_USERNAME=your-residential-username
PROXY_RESIDENTIAL_PASSWORD=your-residential-password
PROXY_RESIDENTIAL_PROTOCOL=http

# Datacenter Proxy Configuration (optional)
PROXY_DATACENTER_HOST=your-datacenter-proxy-host.com
PROXY_DATACENTER_PORT=8080
PROXY_DATACENTER_USERNAME=your-datacenter-username
PROXY_DATACENTER_PASSWORD=your-datacenter-password
PROXY_DATACENTER_PROTOCOL=http

# Proxy Rotation Settings
PROXY_ROTATION_ENABLED=true
PROXY_ROTATION_STRATEGY=round-robin
```

### Proxy Configuration

Configure your proxy providers using environment variables in your `.env` file:

```bash
# Residential Proxy Configuration
PROXY_RESIDENTIAL_HOST=your-residential-proxy-host.com
PROXY_RESIDENTIAL_PORT=10000
PROXY_RESIDENTIAL_USERNAME=your-residential-username
PROXY_RESIDENTIAL_PASSWORD=your-residential-password
PROXY_RESIDENTIAL_PROTOCOL=http

# Datacenter Proxy Configuration (optional)
PROXY_DATACENTER_HOST=your-datacenter-proxy-host.com
PROXY_DATACENTER_PORT=8080
PROXY_DATACENTER_USERNAME=your-datacenter-username
PROXY_DATACENTER_PASSWORD=your-datacenter-password
PROXY_DATACENTER_PROTOCOL=http
```

The [`config/proxy.js`](config/proxy.js:1) file automatically loads these environment variables.

## 📖 Usage Examples

### Health Check

Check if the server is running and view available modules:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "Universal Proxy",
  "modules": ["aws-polly", "openai", "generic-http"],
  "uptime": 123.45
}
```

### List Available Services

Get information about all loaded service modules:

```bash
curl http://localhost:3001/api/services
```

### AWS Polly Text-to-Speech

Convert text to speech using AWS Polly:

```bash
curl -X POST http://localhost:3001/api/aws-polly/tts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "text": "Hello world, this is a test of AWS Polly text-to-speech",
    "voiceId": "Joanna",
    "engine": "neural"
  }' \
  --output speech.mp3
```

**Supported Voices:** Joanna, Matthew, Ivy, Justin, Kendra, Kimberly, Salli, Joey, Amy, Brian, Emma

#### List Available Voices

```bash
curl http://localhost:3001/api/aws-polly/voices \
  -H "x-api-key: your-api-key"
```

### OpenAI API Proxy

#### Chat Completions

```bash
curl -X POST http://localhost:3001/api/openai/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 100
  }'
```

#### Text Completions

```bash
curl -X POST http://localhost:3001/api/openai/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "model": "text-davinci-003",
    "prompt": "Once upon a time",
    "max_tokens": 50
  }'
```

#### Embeddings

```bash
curl -X POST http://localhost:3001/api/openai/embeddings \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "Hello world"
  }'
```

### Generic HTTP Proxy

Proxy any HTTP request through the server:

#### Simple GET Request

```bash
curl -X GET http://localhost:3001/proxy/anything \
  -H "x-target-url: https://api.github.com/users/octocat" \
  -H "x-api-key: your-api-key"
```

#### POST Request with Data

```bash
curl -X POST http://localhost:3001/proxy/anything \
  -H "x-target-url: https://httpbin.org/post" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"message": "Hello World"}'
```

#### Using Residential Proxy

Route requests through a residential proxy for enhanced privacy:

```bash
curl -X GET http://localhost:3001/proxy/anything \
  -H "x-target-url: https://api.example.com/data" \
  -H "x-use-proxy: true" \
  -H "x-proxy-type: residential" \
  -H "x-api-key: your-api-key"
```

**⚠️ Security Note:** The proxy blocks requests to private networks, localhost, and metadata services to prevent SSRF attacks.

#### Proxy with Custom Headers

```bash
curl -X POST http://localhost:3001/proxy/anything \
  -H "x-target-url: https://api.example.com/endpoint" \
  -H "x-use-proxy: true" \
  -H "Authorization: Bearer target-api-token" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "query": "search term",
    "limit": 10
  }'
```

### Important API Changes

⚠️ **Security Updates Made:**

1. **API Authentication**: API keys are now **only** accepted via `x-api-key` header (not query parameters)
2. **AWS Polly Voice Validation**: Only whitelisted voices are accepted (see supported list above)
3. **URL Restrictions**: Generic proxy blocks private networks, localhost, and metadata services
4. **Request Limits**: 10MB maximum request size, 15-second timeouts
5. **Input Validation**: All endpoints now have strict input validation

### Valid Voice IDs for AWS Polly

Only these voice IDs are accepted for security:
- Joanna, Matthew, Ivy, Justin, Kendra, Kimberly, Salli, Joey, Amy, Brian, Emma

### Blocked URLs (Generic Proxy)

For security, these URLs are automatically blocked:
- `http://localhost/*` or `https://localhost/*`
- `http://127.0.0.1/*` or any localhost variation
- `http://10.*.*.*` (private network)
- `http://192.168.*.*` (private network)
- `http://172.16-31.*.*` (private network)
- `http://169.254.169.254/*` (AWS metadata)
- Any URL containing: `internal`, `local`, `corp`, `intranet`, `private`

## 🔧 Advanced Usage

### Custom Headers

The proxy supports various custom headers for enhanced functionality:

- `x-api-key`: Your API key for authentication
- `x-target-url`: Target URL for generic proxy requests
- `x-use-proxy`: Set to `true` to route through residential proxy
- `x-proxy-type`: Specify proxy type (`residential`, `datacenter`)

### Rate Limiting

Different endpoints have different rate limits:

- **AWS Polly TTS**: 50 requests per 15 minutes
- **Generic Proxy**: 200 requests per 15 minutes  
- **Other endpoints**: 1000 requests per 15 minutes

### Error Handling

All responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔌 Adding New Modules

To add a new service module:

1. Create a new file in the [`modules/`](modules/) directory
2. Follow this template:

```javascript
const logger = require('../utils/logger');

const myServiceModule = {
  description: 'Description of your service',
  endpoints: ['endpoint1', 'endpoint2'],

  async handler(endpoint, req, res) {
    switch (endpoint) {
      case 'endpoint1':
        return await this.handleEndpoint1(req, res);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  },

  async handleEndpoint1(req, res) {
    // Your implementation here
    return { message: 'Success' };
  }
};

module.exports = myServiceModule;
```

3. The module will be automatically loaded on server start

## 📊 Monitoring

### Logs

Logs are written to:
- `combined.log`: All log levels
- `error.log`: Error level only
- Console: Formatted output with colors

### Health Checks

The [`/health`](server.js:47) endpoint provides server status and module information.

## 🐳 Docker

The included [`Dockerfile`](Dockerfile:1) and [`docker-compose.yml`](docker-compose.yml:1) make deployment simple:

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔒 Security

### Security Features Implemented

- **SSRF Protection**: Blocks requests to private/internal networks and dangerous protocols
- **Input Validation**: Comprehensive validation and sanitization of all inputs
- **CORS Protection**: Configurable allowed origins with strict validation
- **Enhanced Security Headers**: CSP, HSTS, and other security headers via Helmet
- **Rate Limiting**: Prevents abuse and DoS attacks
- **API Key Authentication**: Header-based authentication (not query params)
- **Error Message Sanitization**: Prevents information disclosure in production
- **Request Size Limits**: 10MB limits to prevent resource exhaustion
- **Timeout Protection**: Prevents hanging requests and resource exhaustion
- **Content Filtering**: Basic filtering for malicious content
- **Redirect Limits**: Prevents redirect loops and attacks
- **Docker Security**: Non-root user, minimal attack surface

### Security Best Practices

**⚠️ Important Security Notes:**

1. **API Keys**: Always use the `x-api-key` header, never query parameters
2. **HTTPS**: Always use HTTPS in production
3. **Environment Variables**: Never commit `.env` files to version control
4. **Regular Updates**: Keep dependencies updated
5. **Monitoring**: Monitor logs for suspicious activity
6. **Network Security**: Use firewalls and VPNs for additional protection

### Blocked URLs (SSRF Protection)

The proxy automatically blocks requests to:
- Private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Localhost and loopback addresses
- Metadata services (169.254.169.254, metadata.google.internal)
- Internal domains (.internal, .local, .corp, etc.)
- Non-HTTP/HTTPS protocols

## 🚨 Troubleshooting

### Common Issues

**Module Loading Errors:**
- Check file permissions in [`modules/`](modules/) directory
- Verify module syntax and exports

**Proxy Connection Failures:**
- Verify proxy credentials in [`config/proxy.js`](config/proxy.js:1)
- Check network connectivity

**Rate Limit Exceeded:**
- Reduce request frequency
- Consider multiple API keys for higher limits

**AWS/OpenAI Authentication:**
- Verify API keys in `.env` file
- Check key permissions and quotas

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your module or improvement
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the logs in `combined.log` and `error.log`
- Review the [`/health`](server.js:47) endpoint output
- Ensure all environment variables are properly configured