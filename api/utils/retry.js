/**
 * Reintentos con backoff exponencial para llamadas a las APIs de Google.
 * Solo reintenta errores transitorios (429 / 5xx / red); los 4xx de negocio
 * (invalid_grant, permisos) se propagan de inmediato.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransient = (error) => {
    const status = error?.response?.status || error?.code;
    if (status === 429 || (typeof status === 'number' && status >= 500)) return true;
    return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up/i.test(error?.message || '');
};

export const withRetry = async (fn, { retries = 3, baseMs = 1000 } = {}) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isTransient(error) || attempt === retries) throw error;
            const delay = baseMs * Math.pow(4, attempt); // 1s, 4s, 16s
            console.warn(`[retry] intento ${attempt + 1} falló (${error.message}); reintento en ${delay}ms`);
            await sleep(delay);
        }
    }
    throw lastError;
};
