const { createClient } = require('@supabase/supabase-js');

// Service role client - USE SPARINGLY, only for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anon client - Respects RLS policies, safer for most operations
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// Log usage warning
if (process.env.NODE_ENV !== 'test') {
  console.warn('🔒 SECURITY: Using service role client. Ensure RLS policies are properly configured.');
}

// Export admin client as default for backward compatibility, but encourage using specific clients
module.exports = supabaseAdmin;
module.exports.supabaseAdmin = supabaseAdmin;
module.exports.supabasePublic = supabasePublic;
