module.exports = {
  residential: {
    host: process.env.PROXY_RESIDENTIAL_HOST,
    port: parseInt(process.env.PROXY_RESIDENTIAL_PORT) || 10000,
    username: process.env.PROXY_RESIDENTIAL_USERNAME,
    password: process.env.PROXY_RESIDENTIAL_PASSWORD,
    protocol: process.env.PROXY_RESIDENTIAL_PROTOCOL || 'http'
  },
  
  datacenter: {
    host: process.env.PROXY_DATACENTER_HOST,
    port: parseInt(process.env.PROXY_DATACENTER_PORT) || 8080,
    username: process.env.PROXY_DATACENTER_USERNAME,
    password: process.env.PROXY_DATACENTER_PASSWORD,
    protocol: process.env.PROXY_DATACENTER_PROTOCOL || 'http'
  },
  
  // Rotation settings
  rotation: {
    enabled: process.env.PROXY_ROTATION_ENABLED === 'true',
    strategy: process.env.PROXY_ROTATION_STRATEGY || 'round-robin' // or 'random'
  }
};