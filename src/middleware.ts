import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user-session');
  const { pathname } = request.nextUrl;

  // Si no hay cookie de sesión y no se está en la página de login, redirigir a login
  if (!sessionCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay una cookie de sesión y se está en la página de login, redirigir a la página principal
  if (sessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// La configuración del matcher protege todas las rutas excepto las especificadas.
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
