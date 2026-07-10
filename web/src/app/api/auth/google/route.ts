import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';
// Base pública para redirects: Next reconstruye req.url con el puerto interno del
// contenedor (80) y pierde el :4100 del host, así que no sirve para armar URLs.
const WEB_URL = process.env.WEB_URL || 'http://localhost:4100';

/** Inicio del login: pide a la API la URL de consentimiento y redirige a Google. */
export async function GET() {
    try {
        const res = await fetch(`${API_URL}/auth/google/url`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || json.status !== 1 || !json.url) {
            const message = encodeURIComponent(json?.message || 'No se pudo iniciar el login');
            return NextResponse.redirect(`${WEB_URL}/login?error=config&detail=${message}`);
        }
        return NextResponse.redirect(json.url);
    } catch {
        return NextResponse.redirect(`${WEB_URL}/login?error=api_down`);
    }
}
