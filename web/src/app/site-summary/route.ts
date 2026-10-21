import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Resumen de un sitio para su escritorio de wp-admin, de servidor a servidor. Sin sesión: el
// sitio se identifica con su token (Authorization: Bearer), que se reenvía tal cual a la API.
// La URL pública es fija (https://cenit.sda.ovh/site-summary) porque el plugin no la deja
// configurar; por eso vive acá y no bajo /api. El middleware de login la deja pasar.
export const dynamic = 'force-dynamic';

// Cabeceras de la API que el sitio necesita ver: el caché y el estado del rate limit.
const PASS_HEADERS = ['Content-Type', 'Cache-Control', 'Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Policy'];

export async function GET(req: NextRequest) {
    const qs = new URL(req.url).search;
    const authorization = req.headers.get('authorization');
    let res: Response;
    try {
        res = await fetch(`${API_URL}/site-summary${qs}`, {
            headers: authorization ? { Authorization: authorization } : {},
            cache: 'no-store',
        });
    } catch {
        return NextResponse.json(
            { status: 0, message: 'Cenit no está disponible en este momento.' },
            { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
        );
    }

    const headers: Record<string, string> = { 'Cache-Control': 'private, no-store' };
    for (const name of PASS_HEADERS) {
        const value = res.headers.get(name);
        if (value) headers[name] = value;
    }
    return new NextResponse(await res.text(), { status: res.status, headers });
}
