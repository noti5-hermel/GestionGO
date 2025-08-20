
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user-session');
  const { pathname } = request.nextUrl;

  const isTryingToAccessApp = pathname !== '/login';
  const hasSession = !!sessionCookie;

  // Si el usuario tiene sesión y trata de acceder a la página de login,
  // lo redirigimos a la página principal del dashboard.
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si el usuario no tiene sesión e intenta acceder a cualquier página
  // protegida de la aplicación, lo redirigimos al login.
  if (!hasSession && isTryingToAccessApp) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si ninguna de las condiciones anteriores se cumple, permitimos
  // que la solicitud continúe a su destino original.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Se aplica el middleware a todas las rutas excepto a las de la API,
    // archivos estáticos, imágenes o el favicon.
    '/((?!api|_next/static|_next/image|favicon.ico|gestion-go.120Z.png).*)',
  ],
}
