# Contributing to Universal Proxy Server

Thank you for your interest in contributing to the Universal Proxy Server! This document provides guidelines for contributing to this project.

## 🚀 Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Make your changes** and test thoroughly
5. **Submit a pull request**

## 📦 Adding New Modules

The easiest way to contribute is by adding new service modules. Here's how:

### Module Template

Create a new file in `modules/your-service.js`:

```javascript
const yourServiceModule = {
  description: 'Brief description of your service',
  endpoints: ['endpoint1', 'endpoint2'],

  async handler(endpoint, req, res) {
    // Validate API keys if required
    if (!process.env.YOUR_SERVICE_API_KEY) {
      throw new Error('Your service API key not configured');
    }

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
    // Input validation
    const { requiredParam } = req.body;
    if (!requiredParam) {
      throw new Error('requiredParam is required');
    }

    // Your implementation here
    return { message: 'Success', data: 'your response' };
  }
};

module.exports = yourServiceModule;
```

### Module Guidelines

- **Input Validation**: Always validate inputs thoroughly
- **Error Handling**: Use descriptive error messages
- **Environment Variables**: Use env vars for API keys/secrets
- **Consistent Response**: Return JSON objects with success/error structure
- **Documentation**: Add clear JSDoc comments

## 🔒 Security Requirements

All contributions must follow these security practices:

- **No Hardcoded Secrets**: Use environment variables
- **Input Sanitization**: Validate and sanitize all inputs
- **SSRF Prevention**: Don't make requests to private networks
- **Error Messages**: Don't leak sensitive information
- **Rate Limiting**: Consider if your module needs special rate limits

## 🧪 Testing

Before submitting:

1. **Test locally**: Ensure your module loads and works
2. **Test edge cases**: Invalid inputs, missing config, etc.
3. **Test security**: Try malicious inputs
4. **Test integration**: Works with existing auth/rate limiting

## 📝 Pull Request Guidelines

### Good PR Titles
- `feat: add Discord webhook module`
- `fix: handle empty response in OpenAI module`
- `docs: update module creation guide`

### PR Description Should Include
- **What**: What does this PR do?
- **Why**: Why is this change needed?
- **How**: How does it work?
- **Testing**: How did you test it?

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing error handling patterns
- Add JSDoc comments for public methods
- Use descriptive variable names

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: Node version, OS, deployment method
- **Steps to Reproduce**: Exact steps to trigger the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Any relevant error messages

## 💡 Feature Requests

For new features, please:

1. **Check existing issues** first
2. **Describe the use case** clearly
3. **Propose an implementation** if possible
4. **Consider security implications**

## 📋 Module Ideas

Looking for inspiration? Here are some module ideas:

- **Notification Services**: Slack, Discord, Telegram
- **Cloud Services**: Cloudflare, DigitalOcean APIs
- **AI Services**: Anthropic Claude, Cohere, Hugging Face
- **Analytics**: Google Analytics, Mixpanel APIs
- **File Services**: Dropbox, Google Drive APIs
- **Database APIs**: Airtable, Notion APIs

## 🤝 Community

- **Be Respectful**: Follow our code of conduct
- **Be Patient**: Reviews take time
- **Be Collaborative**: Work together on solutions
- **Be Secure**: Security is everyone's responsibility

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy Contributing!** 🎉