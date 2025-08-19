
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user-session');
  const { pathname } = request.nextUrl;

  const isTryingToAccessApp = pathname !== '/login';
  const hasSession = !!sessionCookie;

  // Si el usuario tiene una sesión e intenta acceder a la página de login,
  // lo redirigimos a la página principal de la aplicación (usuarios).
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/users', request.url));
  }

  // Si el usuario NO tiene sesión e intenta acceder a cualquier página
  // que no sea el login, lo redirigimos al login.
  if (!hasSession && isTryingToAccessApp) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // En cualquier otro caso (usuario con sesión accediendo a la app, o
  // usuario sin sesión accediendo al login), permitimos que continúe.
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
