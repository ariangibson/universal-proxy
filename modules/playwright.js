const { chromium, firefox, webkit } = require('playwright');
const logger = require('../utils/logger');
const credentialsManager = require('../config/credentials');

const playwrightModule = {
  description: 'Browser-based scraping with Playwright to bypass bot detection',
  endpoints: ['scrape'],

  async handler(endpoint, req, res) {
    if (endpoint !== 'scrape') {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    return await this.scrapePage(req, res);
  },

  async scrapePage(req, res) {
    const {
      url,
      browser = 'chromium',
      waitFor = 'networkidle',
      timeout = 30000,
      selector = null,
      javascript = false,
      userAgent = null,
      viewport = { width: 1920, height: 1080 },
      headers = {},
      stealth = true,
      output = 'html', // html, screenshot, pdf, cookies
      fullPage = false,
      format = 'png', // for screenshots: png, jpeg
      quality = 90, // for jpeg screenshots
      pdfFormat = 'A4', // for PDFs
      landscape = false, // for PDFs
      printBackground = true, // for PDFs
      margin = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }, // for PDFs
      autoLogin = true, // automatically login if credentials are available
      cookieFormat = 'header' // header (Cookie: string) or json (array of objects)
    } = req.body;

    // SECURITY: Validate required parameters
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    // SECURITY: Validate URL and apply SSRF protection
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }

    // SECURITY: Block private networks (reuse logic from generic-http)
    const hostname = parsedUrl.hostname.toLowerCase();
    if (this.isPrivateOrLocalHost(hostname)) {
      throw new Error('Access to private/internal networks is not allowed');
    }

    // SECURITY: Validate browser choice
    const allowedBrowsers = ['chromium', 'firefox', 'webkit'];
    if (!allowedBrowsers.includes(browser)) {
      throw new Error('Invalid browser choice. Use: chromium, firefox, or webkit');
    }

    // SECURITY: Validate timeout
    if (timeout > 60000) {
      throw new Error('Timeout cannot exceed 60 seconds');
    }

    // SECURITY: Validate output type
    const allowedOutputs = ['html', 'screenshot', 'pdf', 'cookies'];
    if (!allowedOutputs.includes(output)) {
      throw new Error('Invalid output type. Use: html, screenshot, pdf, or cookies');
    }

    // SECURITY: Validate screenshot format
    if (output === 'screenshot' && !['png', 'jpeg'].includes(format)) {
      throw new Error('Invalid screenshot format. Use: png or jpeg');
    }

    let browserInstance = null;
    let context = null;
    let page = null;

    try {
      // Launch browser
      const browserEngine = browser === 'chromium' ? chromium : browser === 'firefox' ? firefox : webkit;
      
      const launchOptions = {
        headless: true,
        args: stealth ? [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ] : []
      };

      browserInstance = await browserEngine.launch(launchOptions);

      // Create context with stealth settings
      const contextOptions = {
        viewport,
        userAgent: userAgent || (stealth ? this.getModernUserAgent(browser) : undefined),
        extraHTTPHeaders: headers,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: javascript
      };

      // Add proxy support if configured
      if (req.proxyAgent) {
        // Extract proxy details from agent
        const proxyUrl = req.proxyAgent.proxy;
        if (proxyUrl) {
          contextOptions.proxy = {
            server: proxyUrl.href,
            username: proxyUrl.username,
            password: proxyUrl.password
          };
          logger.info(`Playwright using ${req.proxyType} proxy`);
        }
      }

      context = await browserInstance.newContext(contextOptions);

      // Add stealth scripts
      if (stealth) {
        await context.addInitScript(() => {
          // Remove webdriver property
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });

          // Mock plugins
          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
          });

          // Mock languages
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
          });

          // Override permissions
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );
        });
      }

      page = await context.newPage();

      logger.info(`Playwright ${browser} scraping: ${url}`);

      // Check if we need to login first
      const credentials = credentialsManager.getCredentials(url);
      if (autoLogin && credentials) {
        await this.performLogin(page, credentials, timeout);
      }

      // Navigate to page (or continue after login)
      if (!credentials) {
        await page.goto(url, {
          waitUntil: waitFor,
          timeout
        });
      } else {
        // If we logged in, we're already on the target page or need to navigate
        if (page.url() !== url) {
          await page.goto(url, {
            waitUntil: waitFor,
            timeout
          });
        }
      }

      // Wait for specific selector if provided
      if (selector) {
        await page.waitForSelector(selector, { timeout: 10000 });
      }

      // Handle different output types
      if (output === 'screenshot') {
        const screenshotOptions = {
          fullPage,
          type: format,
        };

        if (format === 'jpeg') {
          screenshotOptions.quality = quality;
        }

        const screenshot = await page.screenshot(screenshotOptions);

        // Set appropriate headers and send binary data
        res.set({
          'Content-Type': `image/${format}`,
          'Content-Length': screenshot.length,
          'Cache-Control': 'public, max-age=3600'
        });

        res.send(screenshot);
        return null; // Response already sent

      } else if (output === 'pdf') {
        // PDF generation only works with Chromium
        if (browser !== 'chromium') {
          throw new Error('PDF generation only works with Chromium browser');
        }

        const pdf = await page.pdf({
          format: pdfFormat,
          landscape,
          printBackground,
          margin
        });

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Length': pdf.length,
          'Cache-Control': 'public, max-age=3600'
        });

        res.send(pdf);
        return null; // Response already sent

      } else if (output === 'cookies') {
        // Extract cookies for API usage
        const cookies = await context.cookies();
        
        if (cookieFormat === 'header') {
          // Format as single Cookie header string (for API calls)
          const cookieHeader = cookies
            .map(cookie => `${cookie.name}=${cookie.value}`)
            .join('; ');
          
          return {
            url: page.url(),
            cookieHeader,
            cookieCount: cookies.length,
            timestamp: new Date().toISOString()
          };
        } else {
          // Format as JSON array
          return {
            url: page.url(),
            cookies,
            cookieCount: cookies.length,
            timestamp: new Date().toISOString()
          };
        }

      } else {
        // Default: HTML content
        let content;
        if (selector) {
          // Get specific element content
          const element = await page.$(selector);
          if (element) {
            content = await element.innerHTML();
          } else {
            throw new Error(`Selector "${selector}" not found`);
          }
        } else {
          // Get full page content
          content = await page.content();
        }

        // Get page metadata
        const title = await page.title();
        const finalUrl = page.url();

        return {
          url: finalUrl,
          title,
          content,
          browser,
          output,
          timestamp: new Date().toISOString(),
          contentLength: content.length
        };
      }

    } catch (error) {
      logger.error(`Playwright scraping error: ${error.message}`);
      throw new Error(`Scraping failed: ${error.message}`);
    } finally {
      // Cleanup
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
      if (browserInstance) await browserInstance.close().catch(() => {});
    }
  },


  // Generate modern, realistic user agents based on browser type
  getModernUserAgent(browser) {
    const userAgents = {
      chromium: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
      webkit: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
    };
    
    return userAgents[browser] || userAgents.chromium;
  },

  // SECURITY: Login automation with secure credential storage
  async performLogin(page, credentials, timeout) {
    try {
      logger.info(`Performing automatic login for ${credentials.loginUrl}`);

      // Navigate to login page
      await page.goto(credentials.loginUrl, {
        waitUntil: 'networkidle',
        timeout
      });

      // Wait for login form elements
      await page.waitForSelector(credentials.usernameSelector, { timeout: 10000 });
      await page.waitForSelector(credentials.passwordSelector, { timeout: 10000 });

      // Fill in credentials
      await page.fill(credentials.usernameSelector, credentials.username);
      await page.fill(credentials.passwordSelector, credentials.password);

      // Submit the form
      await page.click(credentials.submitSelector);

      // Wait for login to complete
      try {
        // Wait for success indicator or navigation
        await Promise.race([
          page.waitForSelector(credentials.successIndicator, { timeout: 10000 }),
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 })
        ]);

        // Additional wait for any post-login processing with proper cleanup
        const waitTime = credentials.waitAfterLogin || 3000;
        
        // Create a cancellable timeout that will be cleaned up if page is closed
        const timeoutPromise = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, waitTime);
          
          // Clean up timeout if page is closed
          const cleanup = () => {
            clearTimeout(timeoutId);
            reject(new Error('Page closed during post-login wait'));
          };
          
          // Listen for page close event to cancel timeout
          page.once('close', cleanup);
          
          // Clean up listener when timeout completes
          setTimeout(() => {
            page.removeListener('close', cleanup);
          }, waitTime + 100);
        });

        try {
          await timeoutPromise;
        } catch (waitError) {
          // If page was closed during wait, continue anyway
          logger.warn(`Post-login wait interrupted: ${waitError.message}`);
        }

        logger.info('Login successful');
        return true;

      } catch (loginError) {
        logger.warn('Login may have failed - continuing anyway:', loginError.message);
        return false;
      }

    } catch (error) {
      logger.error('Login failed:', error.message);
      throw new Error(`Login failed: ${error.message}`);
    }
  },

  // SECURITY: Reuse private network detection from generic-http
  isPrivateOrLocalHost(hostname) {
    // localhost variations
    if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname.startsWith('127.')) {
      return true;
    }

    // IPv6 localhost
    if (hostname === '::1' || hostname === '::' || hostname.startsWith('fe80:')) {
      return true;
    }

    // Private IPv4 ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      return (a === 10) ||
             (a === 172 && b >= 16 && b <= 31) ||
             (a === 192 && b === 168) ||
             (a === 169 && b === 254);
    }

    // Internal domain patterns
    const internalPatterns = [
      'internal', 'local', 'corp', 'intranet', 'private',
      '.internal.', '.local.', '.corp.', '.intranet.', '.private.'
    ];
    return internalPatterns.some(pattern => hostname.includes(pattern));
  }
};

module.exports = playwrightModule;