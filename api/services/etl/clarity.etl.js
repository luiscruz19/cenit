import ClarityDailyMetric from '../../models/ClarityDailyMetric.js';
import { fetchForSite } from '../clarity/clarity.service.js';
import { todayArt, addDays } from '../../utils/dates.js';

/**
 * Paso de ETL de Clarity para un sitio.
 *
 * La API solo da una ventana de las últimas ~24 h agregada (no cortada por día), así que
 * se estampa con la fecha de AYER —el día que la ventana cubre casi entero— y se upsertea
 * por (site_id, date). Correrlo dos veces el mismo día reemplaza, no duplica. No hay
 * backfill posible: el histórico se arma hacia adelante desde que se conecta el token.
 */
export const runClarityForSite = async (site) => {
    const metrics = await fetchForSite(site, 1);
    if (!metrics) return { rows: 0, apiCalls: 0 };

    const date = addDays(todayArt(), -1);

    await ClarityDailyMetric.upsert({
        site_id: site.id,
        date,
        sessions: metrics.sessions,
        bot_sessions: metrics.botSessions,
        distinct_users: metrics.distinctUsers,
        pages_per_session: metrics.pagesPerSession,
        dead_click_pct: metrics.deadClickPct,
        rage_click_pct: metrics.rageClickPct,
        quickback_pct: metrics.quickbackPct,
        excessive_scroll_pct: metrics.excessiveScrollPct,
        script_error_pct: metrics.scriptErrorPct,
        error_click_pct: metrics.errorClickPct,
        avg_scroll_depth: metrics.avgScrollDepth,
        avg_active_time: metrics.avgActiveTime,
    });

    return { rows: 1, apiCalls: 1 };
};
