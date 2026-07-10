/**
 * Fetcher de SWR del lado del cliente: todo pasa por el BFF (/api/proxy/...),
 * que inyecta el JWT desde la cookie httpOnly. El browser nunca ve el token.
 */
export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export const fetcher = async (path: string) => {
    const res = await fetch(`/api/proxy${path}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.status !== 1) {
        if (res.status === 401 && typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new ApiError(json?.message || `Error ${res.status}`, res.status);
    }
    return json;
};

export const postJson = async (path: string, body?: unknown) => {
    const res = await fetch(`/api/proxy${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.status !== 1) {
        throw new ApiError(json?.message || `Error ${res.status}`, res.status);
    }
    return json;
};

export const putJson = async (path: string, body?: unknown) => {
    const res = await fetch(`/api/proxy${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.status !== 1) {
        throw new ApiError(json?.message || `Error ${res.status}`, res.status);
    }
    return json;
};

export const deleteJson = async (path: string) => {
    const res = await fetch(`/api/proxy${path}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.status !== 1) {
        throw new ApiError(json?.message || `Error ${res.status}`, res.status);
    }
    return json;
};
