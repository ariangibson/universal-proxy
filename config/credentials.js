const crypto = require('crypto');

// SECURITY: Credentials are encrypted and stored by domain
// This prevents credentials from being passed in requests
const credentialsStore = {
  // Example structure (these would be encrypted in practice):
  // 'example.com': {
  //   username: 'encrypted_username',
  //   password: 'encrypted_password',
  //   loginUrl: 'https://example.com/login',
  //   usernameSelector: '#username',
  //   passwordSelector: '#password',
  //   submitSelector: '#login-button',
  //   successIndicator: '.dashboard' // Element that appears after login
  // }
};

// SECURITY: Use environment variable for encryption key
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

class CredentialsManager {
  // Encrypt sensitive data
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipherGCM(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  // Get domain from URL
  getDomainFromUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  // Check if we have credentials for a domain
  hasCredentials(url) {
    const domain = this.getDomainFromUrl(url);
    return domain && credentialsStore[domain];
  }

  // Get decrypted credentials for a domain
  getCredentials(url) {
    const domain = this.getDomainFromUrl(url);
    if (!domain || !credentialsStore[domain]) {
      return null;
    }

    const stored = credentialsStore[domain];
    
    return {
      username: this.decrypt(stored.username),
      password: this.decrypt(stored.password),
      loginUrl: stored.loginUrl,
      usernameSelector: stored.usernameSelector || '#username, [name="username"]',
      passwordSelector: stored.passwordSelector || '#password, [name="password"]',
      submitSelector: stored.submitSelector || 'button[type="submit"], #login',
      successIndicator: stored.successIndicator || '.dashboard, .profile',
      waitAfterLogin: stored.waitAfterLogin || 3000
    };
  }

  // Add new credentials (for admin use)
  addCredentials(domain, credentials) {
    // SECURITY: Only allow this in development or with proper admin authentication
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Credential management not available in production via API');
    }

    const encrypted = {
      username: this.encrypt(credentials.username),
      password: this.encrypt(credentials.password),
      loginUrl: credentials.loginUrl,
      usernameSelector: credentials.usernameSelector,
      passwordSelector: credentials.passwordSelector,
      submitSelector: credentials.submitSelector,
      successIndicator: credentials.successIndicator,
      waitAfterLogin: credentials.waitAfterLogin
    };

    credentialsStore[domain] = encrypted;
    return true;
  }

  // List available domains (without sensitive data)
  listDomains() {
    return Object.keys(credentialsStore).map(domain => ({
      domain,
      hasCredentials: true,
      loginUrl: credentialsStore[domain].loginUrl
    }));
  }
}

module.exports = new CredentialsManager();