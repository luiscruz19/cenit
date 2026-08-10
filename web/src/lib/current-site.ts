'use client';

/**
 * "Proyecto actual" persistente. La app vive siempre dentro de un proyecto: no hay vista
 * global. La fuente de verdad es el ?site= de la URL cuando está; si no, el último elegido
 * (localStorage); si no, el primero de la lista. Se guarda para que al volver siga adentro
 * del mismo proyecto.
 */

const KEY = 'cenit.site';

export const readStoredSite = (): string | null => {
    try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    } catch {
        return null;
    }
};

export const storeSite = (id: string) => {
    try {
        if (typeof window !== 'undefined') window.localStorage.setItem(KEY, String(id));
    } catch {
        /* ignorar (modo incógnito, storage lleno) */
    }
};

/**
 * Resuelve el proyecto actual contra la lista de sitios activos: preferencia por el de la
 * URL, luego el guardado, luego el primero. Devuelve el id como string, o null si no hay sitios.
 */
export const resolveCurrentSite = (
    sites: { id: number }[],
    fromUrl?: string | null,
): string | null => {
    if (!sites || sites.length === 0) return null;
    const ids = sites.map((s) => String(s.id));
    if (fromUrl && ids.includes(fromUrl)) return fromUrl;
    const stored = readStoredSite();
    if (stored && ids.includes(stored)) return stored;
    return ids[0];
};
