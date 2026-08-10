import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';

// Proxy genérico server-side: reenvía cualquier llamada a la API de dominio agregando
// el JWT de sesión (cookie httpOnly). El cliente nunca ve el token.
async function handle(req: NextRequest, path: string[]) {
    const qs = new URL(req.url).search;
    const target = '/' + path.join('/') + qs;
    const method = req.method;
    const init: RequestInit = { method };
    if (!['GET', 'HEAD'].includes(method)) {
        init.body = await req.text();
    }
    const res = await apiFetch(target, init);
    const contentType = res.headers.get('Content-Type') || 'application/json';

    // Las respuestas binarias (el PDF de los reportes) NO pueden pasar por res.text():
    // decodificarlas como texto corrompe los bytes. Se reenvían tal cual.
    if (!contentType.includes('json') && !contentType.startsWith('text/')) {
        const buffer = await res.arrayBuffer();
        const headers: Record<string, string> = { 'Content-Type': contentType };
        const disposition = res.headers.get('Content-Disposition');
        if (disposition) headers['Content-Disposition'] = disposition;
        return new NextResponse(buffer, { status: res.status, headers });
    }

    const text = await res.text();
    return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': contentType },
    });
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const POST = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const PUT = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const PATCH = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const DELETE = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
