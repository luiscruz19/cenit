/**
 * Métricas sobre las que se pueden definir alertas. Catálogo cerrado: el `metric` que
 * llega del cliente se valida contra estas claves antes de construir el SQL.
 *
 * Cada métrica expone `agg(cond)`, que devuelve su agregado restringido a una condición
 * de fecha. Se resuelve así, y no parcheando el SQL con reemplazos de texto, porque las
 * métricas compuestas (ratios con NULLIF, promedios ponderados) tienen varios agregados
 * anidados y hay que envolver CADA uno por separado.
 *
 * `cond` siempre lo arma este servidor con literales fijos ('date BETWEEN :from AND :to'),
 * nunca con datos del cliente.
 *
 * `betterWhen` indica hacia dónde es bueno moverse: en posición, subir el número es malo.
 */
export const ALERT_METRICS = {
    sessions: {
        label: 'Sesiones',
        table: 'ga_daily_metrics',
        agg: (c) => `SUM(CASE WHEN ${c} THEN sessions END)`,
        type: 'int',
        betterWhen: 'higher',
    },
    users: {
        label: 'Usuarios',
        table: 'ga_daily_metrics',
        agg: (c) => `SUM(CASE WHEN ${c} THEN total_users END)`,
        type: 'int',
        betterWhen: 'higher',
    },
    pageViews: {
        label: 'Vistas de página',
        table: 'ga_daily_metrics',
        agg: (c) => `SUM(CASE WHEN ${c} THEN page_views END)`,
        type: 'int',
        betterWhen: 'higher',
    },
    engagementRate: {
        label: 'Tasa de interacción',
        table: 'ga_daily_metrics',
        agg: (c) => `SUM(CASE WHEN ${c} THEN engaged_sessions END)
                     / NULLIF(SUM(CASE WHEN ${c} THEN sessions END), 0)`,
        type: 'pct',
        betterWhen: 'higher',
    },
    clicks: {
        label: 'Clicks (búsqueda)',
        table: 'gsc_daily_totals',
        agg: (c) => `SUM(CASE WHEN ${c} THEN clicks END)`,
        type: 'int',
        betterWhen: 'higher',
    },
    impressions: {
        label: 'Impresiones (búsqueda)',
        table: 'gsc_daily_totals',
        agg: (c) => `SUM(CASE WHEN ${c} THEN impressions END)`,
        type: 'int',
        betterWhen: 'higher',
    },
    ctr: {
        label: 'CTR (búsqueda)',
        table: 'gsc_daily_totals',
        agg: (c) => `SUM(CASE WHEN ${c} THEN clicks END)
                     / NULLIF(SUM(CASE WHEN ${c} THEN impressions END), 0)`,
        type: 'pct',
        betterWhen: 'higher',
    },
    position: {
        label: 'Posición media',
        table: 'gsc_daily_totals',
        agg: (c) => `SUM(CASE WHEN ${c} THEN position * impressions END)
                     / NULLIF(SUM(CASE WHEN ${c} THEN impressions END), 0)`,
        type: 'position',
        betterWhen: 'lower',
    },
};

export const OPERATORS = {
    gt: { label: 'es mayor que', needsPrevious: false },
    lt: { label: 'es menor que', needsPrevious: false },
    drop_pct: { label: 'cae más de (%)', needsPrevious: true },
    rise_pct: { label: 'sube más de (%)', needsPrevious: true },
};

/** Catálogo que consume el frontend para armar el constructor de reglas. */
export const getAlertSchema = () => ({
    metrics: Object.entries(ALERT_METRICS).map(([key, m]) => ({
        key, label: m.label, type: m.type, betterWhen: m.betterWhen,
    })),
    operators: Object.entries(OPERATORS).map(([key, o]) => ({
        key, label: o.label, needsPrevious: o.needsPrevious,
    })),
});
