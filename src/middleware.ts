
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user-session');
  const { pathname } = request.nextUrl;

  const isTryingToAccessApp = pathname !== '/login';
  const hasSession = !!sessionCookie;

  // If user has a session and tries to access login page, redirect to home.
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user has no session and tries to access a protected page, redirect to login.
  if (!hasSession && isTryingToAccessApp) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Otherwise, continue to the requested page.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except for static files, images, and the logo.
    '/((?!api|_next/static|_next/image|favicon.ico|gestion-go.120Z.png).*)',
  ],
}
