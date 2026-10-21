import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/constants';

/**
 * Sin cookie de sesión → /login. La validez real del JWT la verifica la API en
 * cada llamada (el proxy devuelve 401 y el cliente redirige); acá alcanza con
 * la presencia de la cookie para no flashear el dashboard.
 */
export function middleware(req: NextRequest) {
    const hasSession = Boolean(req.cookies.get(TOKEN_COOKIE)?.value);
    const { pathname } = req.nextUrl;

    // De servidor a servidor, con el token del sitio: no pasa por el login.
    if (pathname === '/site-summary') {
        return NextResponse.next();
    }
    if (!hasSession && pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', req.url));
    }
    if (hasSession && pathname === '/login') {
        return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
}

export const config = {
    // Todo salvo los route handlers del BFF (/api), assets y archivos estáticos.
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
