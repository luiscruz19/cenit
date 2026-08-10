/**
 * Parseo puro de la respuesta de la Data Export API de Clarity. Sin imports a propósito:
 * es testeable con fixtures sin arrastrar config, base ni red. Fue justo acá donde vivió un
 * bug (la fricción se leía de sessionsCount en vez de sessionsWithMetricPercentage), así que
 * se aísla y se testea con la respuesta real de la API.
 *
 * Nombres de campo REALES de la API (verificados en vivo), no los de la doc de Microsoft
 * (que tiene el typo "distantUserCount").
 */

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

export const parseClarityPayload = (payload) => {
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
