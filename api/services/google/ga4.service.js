import { google } from 'googleapis';
import { withRetry } from '../../utils/retry.js';
import { fromGa4Date } from '../../utils/dates.js';

/**
 * GA4: Admin API (listar propiedades) + Data API (batchRunReports).
 * Cuotas (propiedad estándar): 200k tokens/día — una corrida diaria de este ETL
 * consume decenas de tokens por propiedad, no es una preocupación.
 */

/** Lista todas las propiedades GA4 accesibles por la cuenta. */
export const listProperties = async (authClient) => {
    const admin = google.analyticsadmin({ version: 'v1beta', auth: authClient });
    const properties = [];
    let pageToken;
    do {
        const { data } = await withRetry(() =>
            admin.accountSummaries.list({ pageSize: 200, pageToken })
        );
        for (const account of data.accountSummaries || []) {
            for (const prop of account.propertySummaries || []) {
                properties.push({
                    propertyId: (prop.property || '').replace('properties/', ''),
                    displayName: prop.displayName || '',
                    accountName: account.displayName || '',
                });
            }
        }
        pageToken = data.nextPageToken;
    } while (pageToken);
    return properties;
};

/**
 * URL del stream web de una propiedad (para el matching por dominio en discovery).
 * Devuelve el host del defaultUri del primer web stream, o null.
 */
export const getPropertyHost = async (authClient, propertyId) => {
    const admin = google.analyticsadmin({ version: 'v1beta', auth: authClient });
    try {
        const { data } = await withRetry(() =>
            admin.properties.dataStreams.list({ parent: `properties/${propertyId}`, pageSize: 50 })
        );
        const webStream = (data.dataStreams || []).find((s) => s.webStreamData?.defaultUri);
        if (!webStream) return null;
        return new URL(webStream.webStreamData.defaultUri).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
};

const REPORT_DEFS = ({ from, to, topN, singleDay }) => [
    {
        key: 'totals',
        dimensions: [{ name: 'date' }],
        metrics: ['sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'engagedSessions',
            'engagementRate', 'averageSessionDuration', 'keyEvents'].map((name) => ({ name })),
        limit: '100000',
    },
    {
        key: 'channels',
        dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        limit: '100000',
    },
    {
        key: 'pages',
        dimensions: [{ name: 'date' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        // En un solo día alcanza con pedir el top directo; en rangos se pide de más
        // y se recorta a top N por fecha en código (la API no soporta "top N por fecha").
        limit: singleDay ? String(topN) : '100000',
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    },
    {
        key: 'devices',
        dimensions: [{ name: 'date' }, { name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        limit: '100000',
    },
    {
        // 5 reportes es el máximo de batchRunReports: geografía entra justo en la misma llamada.
        key: 'countries',
        dimensions: [{ name: 'date' }, { name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        limit: singleDay ? String(topN) : '100000',
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
].map(({ key, ...report }) => ({
    key,
    report: { ...report, dateRanges: [{ startDate: from, endDate: to }] },
}));

/**
 * Segundo batch: conversiones por nombre (eventos clave) y páginas de aterrizaje. No entran
 * en el primero porque batchRunReports admite máximo 5 reportes. Es una segunda llamada API.
 */
const REPORT_DEFS_2 = ({ from, to, topN, singleDay }) => [
    {
        key: 'events',
        dimensions: [{ name: 'date' }, { name: 'eventName' }],
        metrics: [{ name: 'keyEvents' }, { name: 'eventCount' }],
        limit: '100000',
        // Solo eventos clave: los que cuentan como conversión.
        dimensionFilter: {
            filter: { fieldName: 'isKeyEvent', stringFilter: { value: 'true' } },
        },
        orderBys: [{ metric: { metricName: 'keyEvents' }, desc: true }],
    },
    {
        key: 'landings',
        dimensions: [{ name: 'date' }, { name: 'landingPage' }],
        metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
        limit: singleDay ? String(topN) : '100000',
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
].map(({ key, ...report }) => ({
    key,
    report: { ...report, dateRanges: [{ startDate: from, endDate: to }] },
}));

/**
 * Corre los 4 reportes del ETL en UNA llamada (batchRunReports) y devuelve filas parseadas:
 * { totals: [{date, ...}], channels: [...], pages: [...], devices: [...] }
 */
export const runReports = async (authClient, propertyId, { from, to, topN }) => {
    const dataApi = google.analyticsdata({ version: 'v1beta', auth: authClient });
    const singleDay = from === to;
    const defs1 = REPORT_DEFS({ from, to, topN, singleDay });
    const defs2 = REPORT_DEFS_2({ from, to, topN, singleDay });

    const property = `properties/${propertyId}`;
    // Dos batches (5 + 2) porque batchRunReports admite máximo 5 reportes. Van en paralelo.
    const [res1, res2] = await Promise.all([
        withRetry(() => dataApi.properties.batchRunReports({ property, requestBody: { requests: defs1.map((d) => d.report) } })),
        withRetry(() => dataApi.properties.batchRunReports({ property, requestBody: { requests: defs2.map((d) => d.report) } })),
    ]);

    const parsed = {};
    const collect = (defs, data) => {
        (data.reports || []).forEach((report, i) => {
            parsed[defs[i].key] = (report.rows || []).map((row) => {
                const dims = row.dimensionValues.map((v) => v.value);
                const mets = row.metricValues.map((v) => Number(v.value) || 0);
                return { date: fromGa4Date(dims[0]), dims: dims.slice(1), mets };
            });
        });
    };
    collect(defs1, res1.data);
    collect(defs2, res2.data);

    // Recorte a top N por fecha para pages y countries (solo hace falta en rangos multi-día;
    // la API no soporta "top N por fecha", así que se pide de más y se recorta acá).
    const trimByDate = (rows) => {
        const byDate = new Map();
        for (const row of rows) {
            if (!byDate.has(row.date)) byDate.set(row.date, []);
            byDate.get(row.date).push(row);
        }
        return [...byDate.values()].flatMap((r) =>
            r.sort((a, b) => b.mets[0] - a.mets[0]).slice(0, topN)
        );
    };
    if (from !== to) {
        if (parsed.pages) parsed.pages = trimByDate(parsed.pages);
        if (parsed.countries) parsed.countries = trimByDate(parsed.countries);
        if (parsed.landings) parsed.landings = trimByDate(parsed.landings);
    }

    return parsed;
};
