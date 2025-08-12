/**
 * Environment variable validation
 * Ensures all required environment variables are set before starting the server
 */

const logger = require('./logger')('validateEnv');

const REQUIRED_ENV_VARS = {
  // Critical - Application won't work without these
  critical: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'OPENAI_API_KEY'
  ],
  // Important - Some features won't work
  important: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_ANON_KEY',
    'NODE_ENV',
    'PORT'
  ],
  // Optional - Nice to have
  optional: [
    'MCP_SERVER_URL',
    'MCP_ENABLED',
    'LOG_LEVEL',
    'FRONTEND_URL'
  ]
};

function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check critical variables
  for (const varName of REQUIRED_ENV_VARS.critical) {
    if (!process.env[varName]) {
      errors.push(`Missing critical environment variable: ${varName}`);
    }
  }

  // Check important variables
  for (const varName of REQUIRED_ENV_VARS.important) {
    if (!process.env[varName]) {
      warnings.push(`Missing important environment variable: ${varName}`);
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long for security');
    }
    if (process.env.JWT_SECRET === 'your_jwt_secret_here' || process.env.JWT_SECRET === 'changeme') {
      errors.push('JWT_SECRET appears to be a placeholder value. Generate a secure random key.');
    }
  }

  // Validate OpenAI API Key format
  if (process.env.OPENAI_API_KEY) {
    if (!process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.startsWith('sk-proj-')) {
      warnings.push('OPENAI_API_KEY does not appear to be a valid OpenAI API key format');
    }
    if (process.env.OPENAI_API_KEY === 'your_openai_api_key') {
      errors.push('OPENAI_API_KEY appears to be a placeholder value');
    }
  }

  // Validate Supabase keys
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY.length < 100) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY appears to be too short for a valid service role key');
    }
    if (process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key') {
      errors.push('SUPABASE_SERVICE_ROLE_KEY appears to be a placeholder value');
    }
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    warnings.push(`Invalid NODE_ENV value: ${process.env.NODE_ENV}. Should be development, production, or test`);
  }

  // Set defaults for missing optional variables
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    logger.info('NODE_ENV not set, defaulting to production');
  }

  if (!process.env.PORT) {
    process.env.PORT = '5000';
    logger.info('PORT not set, defaulting to 5000');
  }

  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  // Report findings
  if (errors.length > 0) {
    logger.error('Critical environment configuration errors found:');
    errors.forEach(err => logger.error(`  - ${err}`));
    throw new Error('Environment validation failed. Please check your .env file.');
  }

  if (warnings.length > 0) {
    logger.warn('Environment configuration warnings:');
    warnings.forEach(warn => logger.warn(`  - ${warn}`));
  }

  logger.info('Environment validation completed successfully');

  // Log configuration (without sensitive values)
  logger.info('Configuration summary:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    MCP_ENABLED: process.env.MCP_ENABLED === 'true',
    STRIPE_CONFIGURED: !!process.env.STRIPE_SECRET_KEY,
    SUPABASE_CONFIGURED: !!process.env.SUPABASE_URL
  });
}

module.exports = { validateEnvironment };
