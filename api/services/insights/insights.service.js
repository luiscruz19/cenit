import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import CONFIG from '../../config/config.js';
import Site from '../../models/Site.js';
import { todayArt, addDays } from '../../utils/dates.js';

/**
 * Insights accionables derivados de las tablas diarias: salud/alertas del portfolio,
 * oportunidades SEO y tendencia mensual. Complementa a metrics.service (que da los
 * agregados "planos"); acá el foco es detectar problemas y oportunidades para decidir.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => Number(v) || 0;

/** Ventanas ancladas al último día con datos (hoy − lag de GSC). */
const windows = () => {
    const anchor = addDays(todayArt(), -CONFIG.ETL.GSC_LAG_DAYS);
    return {
        anchor,
        c0: addDays(anchor, -27), c1: anchor,          // cur28
        p0: addDays(anchor, -55), p1: addDays(anchor, -28), // prev28
        q0: addDays(anchor, -89), q1: anchor,          // cur90
    };
};

// Umbrales de las alertas (un solo lugar para tunear).
const TH = {
    dropWarn: -0.30,      // caída 28d vs 28d previo
    dropCrit: -0.60,
    lowEngage: 0.30,      // engagement rate mínimo aceptable
    lowEngageMinSessions: 200,
    page2Min: 8, page2Max: 20, page2MinImpr: 30, // oportunidad "página 2"
    lowCtrMaxPos: 10, lowCtrMax: 0.02, lowCtrMinImpr: 50, // title/meta a mejorar
};

/**
 * Salud del portfolio: clasifica cada sitio en ok / warning / critical con razones
 * concretas. Detecta lo que un vistazo a la grilla no muestra: tag no instalado,
 * colapso de tráfico (tag roto / sitio caído), sin acceso a Search Console, caídas
 * fuertes y tráfico de baja calidad.
 */
export const getPortfolioHealth = async () => {
    const w = windows();
    const [sites, ga, gsc] = await Promise.all([
        Site.findAll({ where: { is_active: true }, order: [['name', 'ASC']] }),
        select(`SELECT site_id,
            SUM(CASE WHEN date BETWEEN :c0 AND :c1 THEN sessions END) c28,
            SUM(CASE WHEN date BETWEEN :c0 AND :c1 THEN engaged_sessions END) c28eng,
            SUM(CASE WHEN date BETWEEN :p0 AND :p1 THEN sessions END) p28,
            SUM(CASE WHEN date BETWEEN :q0 AND :q1 THEN sessions END) c90,
            COUNT(*) total_days, MAX(date) last_date
            FROM ga_daily_metrics GROUP BY site_id`, w),
        select(`SELECT site_id,
            SUM(CASE WHEN date BETWEEN :c0 AND :c1 THEN clicks END) c28,
            SUM(CASE WHEN date BETWEEN :q0 AND :q1 THEN impressions END) c90impr,
            COUNT(*) total_days, MAX(date) last_date
            FROM gsc_daily_totals GROUP BY site_id`, w),
    ]);
    const gaMap = new Map(ga.map((r) => [r.site_id, r]));
    const gscMap = new Map(gsc.map((r) => [r.site_id, r]));

    const items = sites.map((site) => {
        const g = gaMap.get(site.id);
        const s = gscMap.get(site.id);
        const c28 = num(g?.c28), p28 = num(g?.p28), c90 = num(g?.c90);
        const gaDays = num(g?.total_days), gscDays = num(s?.total_days);
        const drop = p28 > 0 ? (c28 - p28) / p28 : null;
        const engage = c28 > 0 ? num(g?.c28eng) / c28 : null;

        const reasons = [];
        let level = 'ok';
        const bump = (lvl) => { if (lvl === 'critical' || (lvl === 'warning' && level === 'ok')) level = lvl; };

        if (gaDays === 0) {
            bump('critical');
            reasons.push({ code: 'no_ga_data', label: 'Sin datos de GA4: el tag no está instalado o el sitio no tiene tráfico.' });
        } else if (c90 > 0 && c28 === 0) {
            bump('critical');
            reasons.push({ code: 'traffic_collapse', label: `Tráfico cayó a 0 en los últimos 28 días (venía con ${c90.toLocaleString('es-AR')} sesiones en 90d): posible tag roto o sitio caído.` });
        } else if (drop !== null && drop <= TH.dropCrit) {
            bump('critical');
            reasons.push({ code: 'drop', label: `Caída de ${Math.round(drop * 100)}% en sesiones (28d vs 28d previos).` });
        } else if (drop !== null && drop <= TH.dropWarn) {
            bump('warning');
            reasons.push({ code: 'drop', label: `Caída de ${Math.round(drop * 100)}% en sesiones (28d vs 28d previos).` });
        }

        if (!site.gsc_site_url) {
            bump('warning');
            reasons.push({ code: 'gsc_unmapped', label: 'Sin Search Console vinculado: falta la mitad del panorama (SEO).' });
        } else if (gscDays === 0) {
            bump('warning');
            reasons.push({ code: 'gsc_no_access', label: 'Search Console vinculado pero sin datos: la cuenta no tiene permiso de lectura sobre este sitio.' });
        }

        if (engage !== null && engage < TH.lowEngage && c28 >= TH.lowEngageMinSessions) {
            bump('warning');
            reasons.push({ code: 'low_engagement', label: `Interacción baja (${Math.round(engage * 100)}%) con volumen alto: tráfico posiblemente superficial o mal segmentado.` });
        }

        return {
            id: site.id, name: site.name, domain: site.domain,
            level, reasons,
            sessions28: c28, sessions90: c90,
            lastGaDate: g?.last_date ? String(g.last_date) : null,
            lastGscDate: s?.last_date ? String(s.last_date) : null,
        };
    });

    const order = { critical: 0, warning: 1, ok: 2 };
    items.sort((a, b) => order[a.level] - order[b.level] || b.sessions90 - a.sessions90);
    return {
        anchor: w.anchor,
        summary: {
            critical: items.filter((i) => i.level === 'critical').length,
            warning: items.filter((i) => i.level === 'warning').length,
            ok: items.filter((i) => i.level === 'ok').length,
        },
        items,
    };
};

/**
 * Oportunidades SEO (cur90). Dos tipos:
 *  - page2: queries en posición 8–20 con impresiones suficientes → subirlas al top gana clicks.
 *  - lowCtr: queries bien posicionadas (≤10) pero con CTR pobre → reescribir title/meta.
 * `estClicks` estima los clicks ganables si la query llegara a un CTR objetivo razonable.
 */
export const getSeoOpportunities = async (siteId = null) => {
    const w = windows();
    const siteFilter = siteId ? 'AND q.site_id = :siteId' : '';
    const base = { q0: w.q0, q1: w.q1, ...(siteId ? { siteId } : {}) };

    const rows = await select(`
        SELECT q.site_id, s.name, s.domain, q.query,
               SUM(q.clicks) clicks, SUM(q.impressions) impressions,
               SUM(q.position * q.impressions) / NULLIF(SUM(q.impressions), 0) position
        FROM gsc_daily_queries q JOIN sites s ON s.id = q.site_id
        WHERE q.date BETWEEN :q0 AND :q1 ${siteFilter}
        GROUP BY q.site_id, s.name, s.domain, q.query
        HAVING impressions >= :minImpr`, { ...base, minImpr: Math.min(TH.page2MinImpr, TH.lowCtrMinImpr) });

    const page2 = [];
    const lowCtr = [];
    for (const r of rows) {
        const impressions = num(r.impressions), clicks = num(r.clicks), position = num(r.position);
        const ctr = impressions ? clicks / impressions : 0;
        const item = {
            siteId: r.site_id, site: r.name, domain: r.domain, query: r.query,
            clicks, impressions, position: Math.round(position * 10) / 10, ctr,
        };
        if (position >= TH.page2Min && position <= TH.page2Max && impressions >= TH.page2MinImpr) {
            // Si sube a top 5 (CTR objetivo ~8%), clicks potenciales.
            item.estClicks = Math.max(0, Math.round(impressions * 0.08) - clicks);
            page2.push(item);
        } else if (position <= TH.lowCtrMaxPos && ctr < TH.lowCtrMax && impressions >= TH.lowCtrMinImpr) {
            // Si el CTR llega a ~5% con la misma posición.
            item.estClicks = Math.max(0, Math.round(impressions * 0.05) - clicks);
            lowCtr.push(item);
        }
    }
    page2.sort((a, b) => b.estClicks - a.estClicks);
    lowCtr.sort((a, b) => b.estClicks - a.estClicks);
    return {
        anchor: w.anchor,
        page2: page2.slice(0, siteId ? 50 : 40),
        lowCtr: lowCtr.slice(0, siteId ? 50 : 40),
        totals: {
            page2Count: page2.length,
            lowCtrCount: lowCtr.length,
            estClicksGain: [...page2, ...lowCtr].reduce((a, r) => a + r.estClicks, 0),
        },
    };
};

/** Serie mensual larga (16 meses) de un sitio: GA4 + GSC combinados por mes. */
export const getMonthlyTrend = async (siteId) => {
    const [ga, gsc] = await Promise.all([
        select(`SELECT DATE_FORMAT(date,'%Y-%m') ym, SUM(sessions) sessions, SUM(total_users) users,
                SUM(page_views) page_views, SUM(engaged_sessions) engaged
                FROM ga_daily_metrics WHERE site_id = :siteId GROUP BY ym ORDER BY ym`, { siteId }),
        select(`SELECT DATE_FORMAT(date,'%Y-%m') ym, SUM(clicks) clicks, SUM(impressions) impressions,
                SUM(position*impressions)/NULLIF(SUM(impressions),0) position
                FROM gsc_daily_totals WHERE site_id = :siteId GROUP BY ym ORDER BY ym`, { siteId }),
    ]);
    const map = new Map();
    for (const r of ga) map.set(r.ym, {
        ym: r.ym, sessions: num(r.sessions), users: num(r.users), pageViews: num(r.page_views),
        engagementRate: num(r.sessions) ? num(r.engaged) / num(r.sessions) : 0,
        clicks: null, impressions: null, position: null,
    });
    for (const r of gsc) {
        const m = map.get(r.ym) || { ym: r.ym, sessions: null, users: null, pageViews: null, engagementRate: null };
        m.clicks = num(r.clicks); m.impressions = num(r.impressions); m.position = num(r.position);
        map.set(r.ym, m);
    }
    return [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym));
};
