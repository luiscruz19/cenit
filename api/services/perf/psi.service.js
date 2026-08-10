import CONFIG from '../../config/config.js';

/**
 * Cliente de la PageSpeed Insights API de Google (v5). Trae Core Web Vitals de usuarios
 * reales (CrUX) y el score de laboratorio (Lighthouse).
 *
 * Auth: preferentemente una API key (PAGESPEED_API_KEY); si no hay, un access token de la
 * cuenta de Google ya conectada. Cualquiera de las dos sirve; la key es más estable para
 * correr los 21 sitios sin toparse con el límite anónimo.
 *
 * Requiere que la "PageSpeed Insights API" esté habilitada en el proyecto de Google Cloud
 * de la app; si no lo está, la llamada devuelve 403 y el sitio se saltea (no rompe el job).
 */

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
};

/** Umbral de Google: bueno / a mejorar / malo. Usado por el front para el color. */
export const rate = (metric, value) => {
    if (value === null || value === undefined) return null;
    const t = {
        lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25],
        fcp: [1800, 3000], ttfb: [800, 1800],
    }[metric];
    if (!t) return null;
    return value <= t[0] ? 'good' : value <= t[1] ? 'ni' : 'poor';
};

/**
 * Corre PageSpeed para una URL y estrategia ('mobile'|'desktop'). Devuelve las métricas
 * normalizadas, o tira si la API falla.
 *
 * `auth` = { key } o { token }.
 */
export const runPageSpeed = async (url, strategy, auth = {}) => {
    if (typeof fetch !== 'function') throw new Error('fetch no disponible');

    const params = new URLSearchParams({ url, strategy, category: 'performance' });
    if (auth.key || CONFIG.PAGESPEED_API_KEY) params.set('key', auth.key || CONFIG.PAGESPEED_API_KEY);

    const headers = {};
    if (!params.get('key') && auth.token) headers.Authorization = `Bearer ${auth.token}`;

    const res = await fetch(`${ENDPOINT}?${params}`, { headers });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const error = new Error(`PageSpeed: HTTP ${res.status}`);
        error.status = res.status;
        error.body = body.slice(0, 300);
        throw error;
    }
    const data = await res.json();

    // Score de laboratorio (Lighthouse).
    const perfScore = data.lighthouseResult?.categories?.performance?.score;

    // Core Web Vitals de campo (CrUX = usuarios reales). Puede faltar en sitios chicos.
    const field = data.loadingExperience?.metrics || {};
    const fieldVal = (k) => field[k]?.percentile ?? null;
    const hasField = Object.keys(field).length > 0;

    // Laboratorio (fallback cuando no hay datos de campo).
    const audits = data.lighthouseResult?.audits || {};
    const lab = (k) => num(audits[k]?.numericValue);

    const lcp = hasField ? num(fieldVal('LARGEST_CONTENTFUL_PAINT_MS')) : lab('largest-contentful-paint');
    const inp = hasField
        ? num(fieldVal('INTERACTION_TO_NEXT_PAINT') ?? fieldVal('EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT'))
        : lab('interaction-to-next-paint');
    const clsRaw = hasField
        ? fieldVal('CUMULATIVE_LAYOUT_SHIFT_SCORE')
        : audits['cumulative-layout-shift']?.numericValue;
    // CrUX reporta CLS ×100 (percentile entero); Lighthouse lo da como decimal.
    const cls = clsRaw === null || clsRaw === undefined
        ? null
        : (hasField ? Math.round((clsRaw / 100) * 1000) / 1000 : Math.round(clsRaw * 1000) / 1000);
    const fcp = hasField ? num(fieldVal('FIRST_CONTENTFUL_PAINT_MS')) : lab('first-contentful-paint');
    const ttfb = hasField ? num(fieldVal('EXPERIMENTAL_TIME_TO_FIRST_BYTE')) : lab('server-response-time');

    return {
        perfScore: perfScore === null || perfScore === undefined ? null : Math.round(perfScore * 100),
        lcpMs: lcp,
        inpMs: inp,
        cls,
        fcpMs: fcp,
        ttfbMs: ttfb,
        source: hasField ? 'field' : 'lab',
        overall: data.loadingExperience?.overall_category || null,
    };
};
