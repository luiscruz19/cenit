import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import { resolveRange } from './metrics.service.js';

/**
 * Explorer: tabla dinámica sobre las tablas diarias.
 *
 * Deliberadamente NO es un pivot ciego sobre todo junto. Cada tabla tiene su propio
 * grano (totales por día, por consulta, por página, por canal…) y mezclarlas en un
 * mismo GROUP BY multiplicaría filas y daría métricas infladas. Por eso el usuario
 * elige primero un DATASET, y dentro de él combina dimensiones y métricas coherentes.
 *
 * Todo se arma desde catálogos cerrados (nunca desde strings del cliente): las
 * dimensiones y métricas que llegan por query se validan contra estos mapas antes de
 * tocar el SQL, así no hay forma de inyectar nada.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

/** Dimensiones comunes a todos los datasets. */
const SITE_DIM = { label: 'Sitio', sql: 's.name', groupBy: 's.name', type: 'text' };
const DATE_DIM = { label: 'Fecha', sql: 't.date', groupBy: 't.date', type: 'date' };

/** Métricas de Search Console (idénticas en totales, consultas y páginas). */
const GSC_METRICS = {
    clicks: { label: 'Clicks', sql: 'SUM(t.clicks)', type: 'int' },
    impressions: { label: 'Impresiones', sql: 'SUM(t.impressions)', type: 'int' },
    ctr: {
        label: 'CTR',
        sql: 'SUM(t.clicks) / NULLIF(SUM(t.impressions), 0)',
        type: 'pct',
    },
    position: {
        label: 'Posición media',
        sql: 'SUM(t.position * t.impressions) / NULLIF(SUM(t.impressions), 0)',
        type: 'position',
    },
};

export const DATASETS = {
    traffic: {
        label: 'Tráfico (GA4)',
        table: 'ga_daily_metrics',
        dimensions: { site: SITE_DIM, date: DATE_DIM },
        metrics: {
            sessions: { label: 'Sesiones', sql: 'SUM(t.sessions)', type: 'int' },
            users: { label: 'Usuarios', sql: 'SUM(t.total_users)', type: 'int' },
            newUsers: { label: 'Usuarios nuevos', sql: 'SUM(t.new_users)', type: 'int' },
            pageViews: { label: 'Vistas', sql: 'SUM(t.page_views)', type: 'int' },
            engagedSessions: { label: 'Sesiones con interacción', sql: 'SUM(t.engaged_sessions)', type: 'int' },
            keyEvents: { label: 'Eventos clave', sql: 'SUM(t.key_events)', type: 'int' },
            engagementRate: {
                label: 'Tasa de interacción',
                sql: 'SUM(t.engaged_sessions) / NULLIF(SUM(t.sessions), 0)',
                type: 'pct',
            },
            avgSessionDuration: {
                label: 'Duración media',
                sql: 'SUM(t.avg_session_duration * t.sessions) / NULLIF(SUM(t.sessions), 0)',
                type: 'duration',
            },
        },
    },
    search: {
        label: 'Búsqueda (GSC)',
        table: 'gsc_daily_totals',
        dimensions: { site: SITE_DIM, date: DATE_DIM },
        metrics: GSC_METRICS,
    },
    queries: {
        label: 'Consultas (GSC)',
        table: 'gsc_daily_queries',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            query: { label: 'Consulta', sql: 't.query', groupBy: 't.query', type: 'text' },
        },
        metrics: GSC_METRICS,
    },
    gscPages: {
        label: 'Páginas (GSC)',
        table: 'gsc_daily_pages',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            page: { label: 'Página', sql: 't.page', groupBy: 't.page', type: 'text' },
        },
        metrics: GSC_METRICS,
    },
    gaPages: {
        label: 'Páginas (GA4)',
        table: 'ga_daily_pages',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            path: { label: 'Ruta', sql: 't.page_path', groupBy: 't.page_path', type: 'text' },
        },
        metrics: {
            pageViews: { label: 'Vistas', sql: 'SUM(t.page_views)', type: 'int' },
            sessions: { label: 'Sesiones', sql: 'SUM(t.sessions)', type: 'int' },
        },
    },
    channels: {
        label: 'Canales (GA4)',
        table: 'ga_daily_channels',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            channel: { label: 'Canal', sql: 't.channel', groupBy: 't.channel', type: 'text' },
        },
        metrics: {
            sessions: { label: 'Sesiones', sql: 'SUM(t.sessions)', type: 'int' },
            users: { label: 'Usuarios', sql: 'SUM(t.total_users)', type: 'int' },
        },
    },
    devices: {
        label: 'Dispositivos (GA4)',
        table: 'ga_daily_devices',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            device: { label: 'Dispositivo', sql: 't.device_category', groupBy: 't.device_category', type: 'text' },
        },
        metrics: {
            sessions: { label: 'Sesiones', sql: 'SUM(t.sessions)', type: 'int' },
            users: { label: 'Usuarios', sql: 'SUM(t.total_users)', type: 'int' },
        },
    },
    countries: {
        label: 'Países (GA4)',
        table: 'ga_daily_countries',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            country: { label: 'País', sql: 't.country', groupBy: 't.country', type: 'text' },
        },
        metrics: {
            sessions: { label: 'Sesiones', sql: 'SUM(t.sessions)', type: 'int' },
            users: { label: 'Usuarios', sql: 'SUM(t.total_users)', type: 'int' },
        },
    },
    events: {
        label: 'Conversiones (GA4)',
        table: 'ga_daily_events',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            event: { label: 'Evento clave', sql: 't.event_name', groupBy: 't.event_name', type: 'text' },
        },
        metrics: {
            keyEvents: { label: 'Conversiones', sql: 'SUM(t.key_events)', type: 'int' },
            eventCount: { label: 'Eventos', sql: 'SUM(t.event_count)', type: 'int' },
        },
    },
    landings: {
        label: 'Páginas de entrada (GA4)',
        table: 'ga_daily_landings',
        dimensions: {
            site: SITE_DIM,
            date: DATE_DIM,
            landing: { label: 'Página de entrada', sql: 't.landing_page', groupBy: 't.landing_page', type: 'text' },
        },
        metrics: {
            sessions: { label: 'Sesiones', sql: 'SUM(t.sessions)', type: 'int' },
            keyEvents: { label: 'Conversiones', sql: 'SUM(t.key_events)', type: 'int' },
        },
    },
};

/** Catálogo que consume el frontend para armar los selectores. */
export const getSchema = () =>
    Object.entries(DATASETS).map(([key, ds]) => ({
        key,
        label: ds.label,
        dimensions: Object.entries(ds.dimensions).map(([k, d]) => ({ key: k, label: d.label, type: d.type })),
        metrics: Object.entries(ds.metrics).map(([k, m]) => ({ key: k, label: m.label, type: m.type })),
    }));

const num = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * Ejecuta la consulta. `dimensions` y `metrics` son arrays de claves del catálogo;
 * cualquier clave desconocida se descarta en silencio.
 */
export const runExplore = async ({
    dataset = 'traffic', dimensions = [], metrics = [], period = '28d',
    siteId = null, search = '', sort = null, desc = true, limit = 100,
} = {}) => {
    const ds = DATASETS[dataset];
    if (!ds) {
        const error = new Error(`Dataset desconocido: ${dataset}`);
        error.code = 'BAD_DATASET';
        throw error;
    }

    const dims = dimensions.filter((d) => ds.dimensions[d]);
    const mets = metrics.filter((m) => ds.metrics[m]);
    if (mets.length === 0) {
        const error = new Error('Elegí al menos una métrica.');
        error.code = 'NO_METRICS';
        throw error;
    }

    const r = resolveRange(period);

    // La dimensión de texto del dataset (query/page/path/channel/device), si la hay:
    // es sobre la que aplica el buscador.
    const textDimKey = Object.keys(ds.dimensions)
        .find((k) => k !== 'site' && k !== 'date' && ds.dimensions[k].type === 'text');

    const selectParts = [
        ...dims.map((d) => `${ds.dimensions[d].sql} AS \`${d}\``),
        ...mets.map((m) => `${ds.metrics[m].sql} AS \`${m}\``),
    ];
    const groupParts = dims.map((d) => ds.dimensions[d].groupBy);

    const filters = ['t.date BETWEEN :from AND :to'];
    const params = { from: r.from, to: r.to };
    if (siteId) { filters.push('t.site_id = :siteId'); params.siteId = siteId; }
    if (search && textDimKey) {
        filters.push(`${ds.dimensions[textDimKey].sql} LIKE :search`);
        params.search = `%${search}%`;
    }

    // Orden: métrica válida, o la primera métrica elegida.
    const sortKey = ds.metrics[sort] ? sort : mets[0];
    const dir = desc ? 'DESC' : 'ASC';
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);

    const sql = `
        SELECT ${selectParts.join(', ')}
        FROM ${ds.table} t
        JOIN sites s ON s.id = t.site_id
        WHERE ${filters.join(' AND ')}
        ${groupParts.length ? `GROUP BY ${groupParts.join(', ')}` : ''}
        ORDER BY \`${sortKey}\` ${dir}
        LIMIT ${safeLimit}`;

    const rows = await select(sql, params);

    const columns = [
        ...dims.map((d) => ({ key: d, label: ds.dimensions[d].label, type: ds.dimensions[d].type, kind: 'dimension' })),
        ...mets.map((m) => ({ key: m, label: ds.metrics[m].label, type: ds.metrics[m].type, kind: 'metric' })),
    ];

    return {
        dataset,
        range: { from: r.from, to: r.to, days: r.days },
        columns,
        rows: rows.map((row) => {
            const out = {};
            for (const d of dims) out[d] = row[d] === null ? null : String(row[d]);
            for (const m of mets) out[m] = num(row[m]);
            return out;
        }),
        truncated: rows.length === safeLimit,
        limit: safeLimit,
    };
};
