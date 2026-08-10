import { decrypt } from '../google/crypto.service.js';

/**
 * Cliente de la Data Export API de Microsoft Clarity.
 *
 * Endpoint: GET https://www.clarity.ms/export-data/api/v1/project-live-insights
 * Auth:     Authorization: Bearer <token de proyecto>  (Settings → Data Export en Clarity)
 * Límites:  numOfDays ∈ {1,2,3} · 10 requests/día/proyecto · máx 1.000 filas · sin paginar.
 *
 * Los nombres de campo son los REALES de la API (verificados contra respuestas en vivo, no
 * los de la doc de Microsoft, que tiene el typo "distantUserCount"). La respuesta es un
 * array de bloques { metricName, information: [...] }. Sin dimensiones, cada bloque trae una
 * sola fila de resumen.
 *
 * La fricción se guarda como PORCENTAJE de sesiones con esa fricción (sessionsWithMetric-
 * Percentage), que es lo que Clarity muestra en su panel y lo único comparable entre un
 * sitio grande y uno chico sin normalizar a mano.
 */

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

const toNum = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

/** Primera fila del bloque cuyo metricName coincide con alguno de los nombres dados. */
const firstRow = (payload, ...names) => {
    if (!Array.isArray(payload)) return {};
    const wanted = names.map(norm);
    const block = payload.find((b) => b && wanted.includes(norm(b.metricName)));
    return block && Array.isArray(block.information) ? (block.information[0] || {}) : {};
};

/** Lee un campo de una fila probando varios nombres (case/spacing-insensitive). */
const field = (row, ...candidates) => {
    const keys = Object.keys(row || {});
    for (const c of candidates) {
        const k = keys.find((key) => norm(key) === norm(c));
        if (k !== undefined) return toNum(row[k]);
    }
    return null;
};

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

    const traffic = firstRow(payload, 'Traffic');
    const scroll = firstRow(payload, 'ScrollDepth', 'Scroll Depth');
    const engagement = firstRow(payload, 'EngagementTime', 'Engagement Time');

    // % de sesiones con cada tipo de fricción.
    const frictionPct = (...names) =>
        field(firstRow(payload, ...names), 'sessionsWithMetricPercentage');

    return {
        sessions: field(traffic, 'totalSessionCount'),
        botSessions: field(traffic, 'totalBotSessionCount'),
        distinctUsers: field(traffic, 'distinctUserCount', 'distantUserCount'),
        pagesPerSession: field(traffic, 'pagesPerSessionPercentage'),

        deadClickPct: frictionPct('DeadClickCount', 'Dead Click Count'),
        rageClickPct: frictionPct('RageClickCount', 'Rage Click Count'),
        quickbackPct: frictionPct('QuickbackClick', 'Quickback Click'),
        excessiveScrollPct: frictionPct('ExcessiveScroll', 'Excessive Scroll'),
        scriptErrorPct: frictionPct('ScriptErrorCount', 'Script Error Count'),
        errorClickPct: frictionPct('ErrorClickCount', 'Error Click Count'),

        avgScrollDepth: field(scroll, 'averageScrollDepth'),
        // activeTime = tiempo realmente interactuando (no incluye la pestaña en idle).
        avgActiveTime: field(engagement, 'activeTime', 'totalTime'),
    };
};

/** Conveniencia: recibe el sitio, descifra el token y trae las métricas. */
export const fetchForSite = async (site, numOfDays = 1) => {
    if (!site.clarity_api_token_enc) return null;
    const token = decrypt(site.clarity_api_token_enc);
    return fetchClarityMetrics(token, numOfDays);
};
