import { decrypt } from '../google/crypto.service.js';
import { parseClarityPayload } from './clarity.parse.js';

/**
 * Cliente de la Data Export API de Microsoft Clarity.
 *
 * Endpoint: GET https://www.clarity.ms/export-data/api/v1/project-live-insights
 * Auth:     Authorization: Bearer <token de proyecto>  (Settings → Data Export en Clarity)
 * Límites:  numOfDays ∈ {1,2,3} · 10 requests/día/proyecto · máx 1.000 filas · sin paginar.
 *
 * El parseo de la respuesta vive en clarity.parse.js (puro y testeado). Acá queda solo la
 * llamada de red.
 */

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

/** Llama a la API con el token en claro. Devuelve el JSON o tira con un error legible. */
const callApi = async (token, numOfDays) => {
    if (typeof fetch !== 'function') {
        throw new Error('fetch no está disponible en este runtime de Node');
    }
    const res = await fetch(`${ENDPOINT}?numOfDays=${numOfDays}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const msg = res.status === 401 ? 'token inválido o vencido'
            : res.status === 403 ? 'token sin permiso para este proyecto'
                : res.status === 429 ? 'se superó el límite diario de la API de Clarity (10/día)'
                    : `HTTP ${res.status}`;
        const error = new Error(`Clarity: ${msg}`);
        error.status = res.status;
        error.body = body.slice(0, 300);
        throw error;
    }
    return res.json();
};

/**
 * Trae y normaliza las métricas de un proyecto. `numOfDays` por defecto 1 (ventana de ~24h).
 * Devuelve un objeto plano listo para el upsert, o tira si la API falla.
 */
export const fetchClarityMetrics = async (token, numOfDays = 1) => {
    const payload = await callApi(token, Math.min(Math.max(numOfDays, 1), 3));
    return parseClarityPayload(payload);
};

/** Conveniencia: recibe el sitio, descifra el token y trae las métricas. */
export const fetchForSite = async (site, numOfDays = 1) => {
    if (!site.clarity_api_token_enc) return null;
    const token = decrypt(site.clarity_api_token_enc);
    return fetchClarityMetrics(token, numOfDays);
};
