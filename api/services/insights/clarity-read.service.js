import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import Site from '../../models/Site.js';
import { resolveRange } from '../metrics/metrics.service.js';

/**
 * Lectura de las métricas de Clarity ya guardadas por el ETL. No llama a la API de
 * Clarity (eso lo hace el ETL diario): lee la tabla clarity_daily_metrics.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const num = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * GET /insights/clarity?siteId=&period= — resumen de fricción del período + serie diaria.
 * Devuelve connected/hasData para que el front sepa si mostrar los datos, invitar a
 * conectar el token, o avisar que todavía no se juntó historia.
 */
export const getSiteClarity = async (siteId, period = '28d') => {
    const site = await Site.findByPk(siteId);
    if (!site) {
        const error = new Error('Sitio no encontrado');
        error.code = 'SITE_NOT_FOUND';
        throw error;
    }

    const connected = Boolean(site.clarity_api_token_enc);
    const r = resolveRange(period);
    const base = { siteId, from: r.from, to: r.to };

    const [totals, series] = await Promise.all([
        select(
            // Los porcentajes se ponderan por sesiones: un día con 2 sesiones no puede pesar
            // igual que uno con 200. SUM(pct*sessions)/SUM(sessions) es el % real del período.
            `SELECT SUM(sessions) sessions, SUM(distinct_users) users, COUNT(*) days,
                    SUM(dead_click_pct * sessions)      / NULLIF(SUM(sessions),0) dead_click_pct,
                    SUM(rage_click_pct * sessions)      / NULLIF(SUM(sessions),0) rage_click_pct,
                    SUM(quickback_pct * sessions)       / NULLIF(SUM(sessions),0) quickback_pct,
                    SUM(excessive_scroll_pct * sessions)/ NULLIF(SUM(sessions),0) excessive_scroll_pct,
                    SUM(script_error_pct * sessions)    / NULLIF(SUM(sessions),0) script_error_pct,
                    SUM(pages_per_session * sessions)   / NULLIF(SUM(sessions),0) pages_per_session,
                    SUM(avg_scroll_depth * sessions)    / NULLIF(SUM(sessions),0) avg_scroll_depth,
                    SUM(avg_active_time * sessions)     / NULLIF(SUM(sessions),0) avg_active_time
             FROM clarity_daily_metrics
             WHERE site_id = :siteId AND date BETWEEN :from AND :to`,
            base
        ),
        select(
            `SELECT date, sessions, dead_click_pct, rage_click_pct, quickback_pct
             FROM clarity_daily_metrics
             WHERE site_id = :siteId AND date BETWEEN :from AND :to
             ORDER BY date ASC`,
            base
        ),
    ]);

    const t = totals[0] || {};
    const round = (v, d = 1) => (num(v) === null ? null : Math.round(num(v) * 10 ** d) / 10 ** d);

    return {
        connected,
        hasData: num(t.days) > 0,
        range: { from: r.from, to: r.to, days: r.days },
        clarityProjectId: site.clarity_project_id || null,
        summary: {
            sessions: num(t.sessions) || 0,
            users: num(t.users) || 0,
            // % de sesiones con cada fricción, ponderado por sesiones a lo largo del período.
            deadClickPct: round(t.dead_click_pct),
            rageClickPct: round(t.rage_click_pct),
            quickbackPct: round(t.quickback_pct),
            excessiveScrollPct: round(t.excessive_scroll_pct),
            scriptErrorPct: round(t.script_error_pct),
            pagesPerSession: round(t.pages_per_session, 1),
            avgScrollDepth: round(t.avg_scroll_depth),
            avgActiveTime: round(t.avg_active_time, 0),
        },
        series: series.map((row) => ({
            date: String(row.date),
            sessions: num(row.sessions) || 0,
            deadClickPct: num(row.dead_click_pct),
            rageClickPct: num(row.rage_click_pct),
            quickbackPct: num(row.quickback_pct),
        })),
    };
};
