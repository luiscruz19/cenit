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
    const text = await res.text();
    return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const POST = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const PUT = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const PATCH = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
export const DELETE = (req: NextRequest, ctx: Ctx) => handle(req, ctx.params.path);
