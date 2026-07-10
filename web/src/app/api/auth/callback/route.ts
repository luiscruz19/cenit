import { NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/api';

const API_URL = process.env.API_URL || 'http://localhost:4000';
// Base pública para redirects (req.url pierde el puerto :4100 dentro del contenedor).
const WEB_URL = process.env.WEB_URL || 'http://localhost:4100';

/**
 * Callback de Google OAuth (este es el redirect URI registrado en Cloud Console).
 * Reenvía { code, state } a la API; si el email está habilitado recibe el JWT de
 * sesión y lo guarda en cookie httpOnly. El browser nunca ve el token.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');

    if (oauthError || !code || !state) {
        return NextResponse.redirect(`${WEB_URL}/login?error=cancelled`);
    }

    try {
        const res = await fetch(`${API_URL}/auth/google/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
            cache: 'no-store',
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || json?.status !== 1 || !json?.token) {
            const code = json?.code || 'unknown';
            return NextResponse.redirect(`${WEB_URL}/login?error=${code}`);
        }

        const response = NextResponse.redirect(`${WEB_URL}/`);
        response.cookies.set(TOKEN_COOKIE, json.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // igual que la expiración del JWT
            path: '/',
        });
        return response;
    } catch {
        return NextResponse.redirect(`${WEB_URL}/login?error=api_down`);
    }
}
