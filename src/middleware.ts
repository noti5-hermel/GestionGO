import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user-session');
  const { pathname } = request.nextUrl;

  // If no session cookie and not on the login page, redirect to login
  if (!sessionCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If there is a session cookie and the user is on the login page, redirect to the dashboard
  if (sessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow access if the user is on the login page or has a session
  return NextResponse.next();
}

// Middleware configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - gestion-go.120Z.png (logo)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|gestion-go.120Z.png).*)',
  ],
}
