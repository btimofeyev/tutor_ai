# Security Configuration Guide

## Overview

This document outlines the security measures implemented in the Tutor AI application and provides guidance for secure deployment.

## Critical Security Measures Implemented

### 1. Environment Variable Security

#### Required Environment Variables
```bash
# Critical - Application won't start without these
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ADMIN ONLY - bypasses RLS
JWT_SECRET=your_32_character_minimum_secret
OPENAI_API_KEY=your_openai_api_key

# Important - Some features won't work properly
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_ANON_KEY=your_supabase_anon_key  # Respects RLS policies
NODE_ENV=production
PORT=5000
```

#### Security Validations Applied
- **JWT_SECRET**: Must be at least 32 characters, cannot be placeholder values
- **OPENAI_API_KEY**: Must start with `sk-` or `sk-proj-`, cannot be placeholder
- **SUPABASE_SERVICE_ROLE_KEY**: Must be proper length, cannot be placeholder
- **NODE_ENV**: Must be one of: development, production, test

### 2. Database Security (Supabase)

#### Dual Client Architecture
```javascript
// Service role client - USE SPARINGLY, only for admin operations
const supabaseAdmin = require('./utils/supabaseClient').supabaseAdmin;

// Anon client - Respects RLS policies, safer for most operations  
const supabasePublic = require('./utils/supabaseClient').supabasePublic;
```

#### Critical Security Notes
- **Service Role Key** bypasses Row Level Security (RLS) - use with extreme caution
- **Anonymous Key** respects RLS policies and should be used for user operations
- Application logs warning when service role client is used

### 3. API Key Management

#### Secure Key Manager Features
- **Rate limiting monitoring**: Tracks API usage per service
- **Key format validation**: Ensures API keys are in correct format
- **Usage tracking**: Monitors API calls for potential abuse
- **Secure logging**: Masks sensitive values in logs

#### Usage Example
```javascript
const keyManager = require('./utils/secureKeys');
const openai = new OpenAI({
  apiKey: keyManager.getOpenAIKey(), // Validated and tracked
});
```

## Deployment Security Checklist

### Before Deployment

- [ ] **Generate secure JWT secret**: `openssl rand -base64 32`
- [ ] **Set NODE_ENV=production** explicitly
- [ ] **Verify all API keys** are production keys, not test/placeholder values
- [ ] **Configure CORS origins** to only include production domains
- [ ] **Enable HTTPS** for all external communications
- [ ] **Set up Supabase RLS policies** properly to prevent unauthorized access

### Environment Configuration

#### Production Environment Template
```bash
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# Generate with: openssl rand -base64 32
JWT_SECRET=YOUR_32_CHAR_MINIMUM_SECRET_HERE

# Supabase (configure RLS policies before using service role)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ADMIN - use sparingly
SUPABASE_ANON_KEY=eyJ...  # PUBLIC - respects RLS

# OpenAI (use production key with spending limits)
OPENAI_API_KEY=sk-...

# Stripe (use production keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS (production domains only)
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Security Monitoring

### Automatic Security Checks
- Environment variable validation on startup
- API key format validation
- Usage rate monitoring
- Security warnings in logs

### Manual Security Checks
- Review database RLS policies regularly
- Monitor API usage and costs
- Check for unauthorized access attempts
- Audit environment variable access

## Best Practices

### Database Security
1. **Use supabasePublic client** for user operations when possible
2. **Use supabaseAdmin client** only for legitimate admin operations
3. **Implement proper RLS policies** before production deployment
4. **Regular security audits** of database access patterns

### API Key Security
1. **Use environment variables** never hardcode keys
2. **Set spending limits** on OpenAI API key
3. **Monitor usage patterns** for abnormal activity
4. **Rotate keys regularly** following security best practices

### Application Security
1. **Use HTTPS only** in production
2. **Configure CORS properly** limit to production domains
3. **Keep dependencies updated** regularly audit for vulnerabilities
4. **Log security events** but never log sensitive data

## Security Incident Response

If security breach suspected:

1. **Immediately rotate all API keys**
2. **Review access logs** for unauthorized usage
3. **Check database for data breaches**
4. **Update environment variables** on all deployment platforms
5. **Audit RLS policies** ensure they're properly configured

## Contact

For security concerns, please review the code and follow standard security practices for your deployment environment.

---

**Last Updated**: $(date)  
**Version**: 1.0  
**Status**: Production Ready with Enhanced Security