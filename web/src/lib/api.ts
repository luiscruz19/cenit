import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from './constants';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export { TOKEN_COOKIE };

export function getToken(): string | null {
    return cookies().get(TOKEN_COOKIE)?.value || null;
}

/** Llama a la API de dominio con el JWT de sesión (header `token`), server-side. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    return fetch(`${API_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', token: token || '', ...(init.headers || {}) },
        cache: 'no-store',
    });
}
