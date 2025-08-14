import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const { data: { session }, error } = await supabase.auth.getSession();

  // If there's an error getting the session, it might be expired
  if (error) {
    console.log('Session error in middleware:', error.message);
  }

  // Check if we're on a protected route
  const protectedRoutes = ['/dashboard', '/subject', '/schedule', '/analytics'];
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  // If on protected route and no session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If there's a session, try to refresh it automatically
  if (session) {
    // Check if token is close to expiry (within 5 minutes)
    const expiresAt = session.expires_at;
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - currentTime;
    
    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log('Token expiring soon, attempting refresh...');
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        // If refresh fails and we're on a protected route, redirect to login
        if (isProtectedRoute) {
          const redirectUrl = new URL('/login', req.url);
          redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
          return NextResponse.redirect(redirectUrl);
        }
      } else if (newSession) {
        console.log('Session refreshed successfully');
        // Update the response with the new session
        res.cookies.set({
          name: 'sb-access-token',
          value: newSession.access_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        
        res.cookies.set({
          name: 'sb-refresh-token',
          value: newSession.refresh_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|klio_logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};