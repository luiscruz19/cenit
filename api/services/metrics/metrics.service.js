import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import CONFIG from '../../config/config.js';
import Site from '../../models/Site.js';
import { todayArt, addDays } from '../../utils/dates.js';

/**
 * Agregaciones para el dashboard. Todo sale de las tablas diarias propias (nunca
 * de las APIs de Google en vivo): el dashboard es instantáneo y no consume cuota.
 * Si el overview llegara a pesar, hay Redis disponible en net-shared para cachearlo.
 */

const PERIODS = { '7d': 7, '28d': 28, '90d': 90 };

/**
 * Rango del período pedido + el período inmediatamente anterior de igual longitud.
 * Termina en hoy−GSC_LAG_DAYS para comparar GA4 y GSC sobre días con datos completos.
 */
export const resolveRange = (period = '28d') => {
    const days = PERIODS[period] || PERIODS['28d'];
    const to = addDays(todayArt(), -CONFIG.ETL.GSC_LAG_DAYS);
    const from = addDays(to, -(days - 1));
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(days - 1));
    // Mismo período un año atrás (YoY). Hay ~16 meses de histórico, así que aplica
    // para el rango reciente; si no hay datos tan viejos, las sumas dan 0 y el front lo omite.
    const yoyFrom = addDays(from, -365);
    const yoyTo = addDays(to, -365);
    return { days, from, to, prevFrom, prevTo, yoyFrom, yoyTo };
};

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const num = (v) => Number(v) || 0;

const GA_AGG = `
    SELECT site_id,
           SUM(sessions)                                            AS sessions,
           SUM(total_users)                                         AS users,
           SUM(new_users)                                           AS new_users,
           SUM(page_views)                                          AS page_views,
           SUM(engaged_sessions)                                    AS engaged_sessions,
           SUM(key_events)                                          AS key_events,
           SUM(avg_session_duration * sessions) / NULLIF(SUM(sessions), 0) AS avg_session_duration
    FROM ga_daily_metrics
    WHERE date BETWEEN :from AND :to {siteFilter}
    GROUP BY site_id`;

const GSC_AGG = `
    SELECT site_id,
           SUM(clicks)                                              AS clicks,
           SUM(impressions)                                         AS impressions,
           SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
    FROM gsc_daily_totals
    WHERE date BETWEEN :from AND :to {siteFilter}
    GROUP BY site_id`;

const parseGa = (row) => row && {
    sessions: num(row.sessions),
    users: num(row.users),
    newUsers: num(row.new_users),
    pageViews: num(row.page_views),
    engagementRate: num(row.sessions) ? num(row.engaged_sessions) / num(row.sessions) : 0,
    avgSessionDuration: num(row.avg_session_duration),
    keyEvents: num(row.key_events),
};

const parseGsc = (row) => row && {
    clicks: num(row.clicks),
    impressions: num(row.impressions),
    ctr: num(row.impressions) ? num(row.clicks) / num(row.impressions) : 0,
    position: num(row.position),
};

const bySiteId = (rows) => new Map(rows.map((r) => [r.site_id, r]));

/** Overview multi-sitio: KPIs del período + prev + sparklines, en una sola respuesta. */
export const getOverview = async (period) => {
    const range = resolveRange(period);
    const { from, to, prevFrom, prevTo, yoyFrom, yoyTo } = range;
    const gaSql = GA_AGG.replace('{siteFilter}', '');
    const gscSql = GSC_AGG.replace('{siteFilter}', '');

    const [sites, gaCur, gaPrev, gaYoy, gscCur, gscPrev, gscYoy, gaSpark, gscSpark] = await Promise.all([
        Site.findAll({ where: { is_active: true }, order: [['name', 'ASC']] }),
        select(gaSql, { from, to }),
        select(gaSql, { from: prevFrom, to: prevTo }),
        select(gaSql, { from: yoyFrom, to: yoyTo }),
        select(gscSql, { from, to }),
        select(gscSql, { from: prevFrom, to: prevTo }),
        select(gscSql, { from: yoyFrom, to: yoyTo }),
        select(
            'SELECT site_id, date, sessions FROM ga_daily_metrics WHERE date BETWEEN :from AND :to ORDER BY date',
            { from, to }
        ),
        select(
            'SELECT site_id, date, clicks FROM gsc_daily_totals WHERE date BETWEEN :from AND :to ORDER BY date',
            { from, to }
        ),
    ]);

    const gaCurMap = bySiteId(gaCur);
    const gaPrevMap = bySiteId(gaPrev);
    const gaYoyMap = bySiteId(gaYoy);
    const gscCurMap = bySiteId(gscCur);
    const gscPrevMap = bySiteId(gscPrev);
    const gscYoyMap = bySiteId(gscYoy);

    const sparkMap = new Map();
    for (const row of gaSpark) {
        if (!sparkMap.has(row.site_id)) sparkMap.set(row.site_id, new Map());
        sparkMap.get(row.site_id).set(String(row.date), { sessions: num(row.sessions), clicks: 0 });
    }
    for (const row of gscSpark) {
        if (!sparkMap.has(row.site_id)) sparkMap.set(row.site_id, new Map());
        const day = sparkMap.get(row.site_id).get(String(row.date)) || { sessions: 0, clicks: 0 };
        day.clicks = num(row.clicks);
        sparkMap.get(row.site_id).set(String(row.date), day);
    }

    return {
        range,
        sites: sites.map((site) => {
            const spark = sparkMap.get(site.id);
            const sparkDates = spark ? [...spark.keys()].sort() : [];
            return {
                id: site.id,
                name: site.name,
                domain: site.domain,
                mapped: { ga4: Boolean(site.ga4_property_id), gsc: Boolean(site.gsc_site_url) },
                ga: parseGa(gaCurMap.get(site.id)) || null,
                gaPrev: parseGa(gaPrevMap.get(site.id)) || null,
                gaYoy: parseGa(gaYoyMap.get(site.id)) || null,
                gsc: parseGsc(gscCurMap.get(site.id)) || null,
                gscPrev: parseGsc(gscPrevMap.get(site.id)) || null,
                gscYoy: parseGsc(gscYoyMap.get(site.id)) || null,
                spark: {
                    dates: sparkDates,
                    sessions: sparkDates.map((d) => spark.get(d).sessions),
                    clicks: sparkDates.map((d) => spark.get(d).clicks),
                },
            };
        }),
    };
};

/** Detalle de un sitio: KPIs, series diarias, canales, dispositivos y tops. */
export const getSiteDetail = async (siteId, period) => {
    const range = resolveRange(period);
    const { from, to, prevFrom, prevTo, yoyFrom, yoyTo } = range;
    const gaSql = GA_AGG.replace('{siteFilter}', 'AND site_id = :siteId');
    const gscSql = GSC_AGG.replace('{siteFilter}', 'AND site_id = :siteId');
    const base = { siteId };

    const [
        gaCur, gaPrev, gaYoy, gscCur, gscPrev, gscYoy,
        gaSeries, gscSeries,
        channelsCur, channelsPrev, devices,
        gaPages, gscQueries, gscPages, countries, events, landings,
    ] = await Promise.all([
        select(gaSql, { ...base, from, to }),
        select(gaSql, { ...base, from: prevFrom, to: prevTo }),
        select(gaSql, { ...base, from: yoyFrom, to: yoyTo }),
        select(gscSql, { ...base, from, to }),
        select(gscSql, { ...base, from: prevFrom, to: prevTo }),
        select(gscSql, { ...base, from: yoyFrom, to: yoyTo }),
        select(
            `SELECT date, sessions, total_users, page_views
             FROM ga_daily_metrics WHERE site_id = :siteId AND date BETWEEN :from AND :to ORDER BY date`,
            { ...base, from, to }
        ),
        select(
            `SELECT date, clicks, impressions, position
             FROM gsc_daily_totals WHERE site_id = :siteId AND date BETWEEN :from AND :to ORDER BY date`,
            { ...base, from, to }
        ),
        select(
            `SELECT channel, SUM(sessions) AS sessions, SUM(total_users) AS users
             FROM ga_daily_channels WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY channel ORDER BY sessions DESC`,
            { ...base, from, to }
        ),
        select(
            `SELECT channel, SUM(sessions) AS sessions
             FROM ga_daily_channels WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY channel`,
            { ...base, from: prevFrom, to: prevTo }
        ),
        select(
            `SELECT device_category, SUM(sessions) AS sessions
             FROM ga_daily_devices WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY device_category ORDER BY sessions DESC`,
            { ...base, from, to }
        ),
        select(
            `SELECT page_path, SUM(page_views) AS page_views, SUM(sessions) AS sessions
             FROM ga_daily_pages WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY page_path ORDER BY page_views DESC LIMIT 20`,
            { ...base, from, to }
        ),
        select(
            `SELECT query, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
                    SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
             FROM gsc_daily_queries WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY query ORDER BY clicks DESC, impressions DESC LIMIT 20`,
            { ...base, from, to }
        ),
        select(
            `SELECT page, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
                    SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
             FROM gsc_daily_pages WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY page ORDER BY clicks DESC, impressions DESC LIMIT 20`,
            { ...base, from, to }
        ),
        select(
            `SELECT country, SUM(sessions) AS sessions
             FROM ga_daily_countries WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY country ORDER BY sessions DESC LIMIT 12`,
            { ...base, from, to }
        ),
        select(
            `SELECT event_name, SUM(key_events) AS key_events
             FROM ga_daily_events WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY event_name ORDER BY key_events DESC LIMIT 12`,
            { ...base, from, to }
        ),
        select(
            `SELECT landing_page, SUM(sessions) AS sessions, SUM(key_events) AS key_events
             FROM ga_daily_landings WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY landing_page ORDER BY sessions DESC LIMIT 20`,
            { ...base, from, to }
        ),
    ]);

    // Merge de series GA4 + GSC por fecha (GSC puede no tener los últimos días).
    const seriesMap = new Map();
    for (const row of gaSeries) {
        seriesMap.set(String(row.date), {
            date: String(row.date),
            sessions: num(row.sessions),
            users: num(row.total_users),
            pageViews: num(row.page_views),
            clicks: null,
            impressions: null,
            position: null,
        });
    }
    for (const row of gscSeries) {
        const day = seriesMap.get(String(row.date)) || {
            date: String(row.date), sessions: null, users: null, pageViews: null,
        };
        day.clicks = num(row.clicks);
        day.impressions = num(row.impressions);
        day.position = num(row.position);
        seriesMap.set(String(row.date), day);
    }

    const prevChannels = new Map(channelsPrev.map((r) => [r.channel, num(r.sessions)]));

    return {
        range,
        kpis: {
            ga: parseGa(gaCur[0]) || null,
            gaPrev: parseGa(gaPrev[0]) || null,
            gaYoy: parseGa(gaYoy[0]) || null,
            gsc: parseGsc(gscCur[0]) || null,
            gscPrev: parseGsc(gscPrev[0]) || null,
            gscYoy: parseGsc(gscYoy[0]) || null,
        },
        series: [...seriesMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
        channels: channelsCur.map((r) => ({
            channel: r.channel,
            sessions: num(r.sessions),
            users: num(r.users),
            prevSessions: prevChannels.get(r.channel) ?? 0,
        })),
        devices: devices.map((r) => ({ device: r.device_category, sessions: num(r.sessions) })),
        countries: countries.map((r) => ({ country: r.country, sessions: num(r.sessions) })),
        events: events.map((r) => ({ event: r.event_name, keyEvents: num(r.key_events) })),
        landings: landings.map((r) => ({
            path: r.landing_page, sessions: num(r.sessions), keyEvents: num(r.key_events),
        })),
        gaPages: gaPages.map((r) => ({
            path: r.page_path, pageViews: num(r.page_views), sessions: num(r.sessions),
        })),
        gscQueries: gscQueries.map((r) => ({
            query: r.query,
            clicks: num(r.clicks),
            impressions: num(r.impressions),
            ctr: num(r.impressions) ? num(r.clicks) / num(r.impressions) : 0,
            position: num(r.position),
        })),
        gscPages: gscPages.map((r) => ({
            page: r.page,
            clicks: num(r.clicks),
            impressions: num(r.impressions),
            ctr: num(r.impressions) ? num(r.clicks) / num(r.impressions) : 0,
            position: num(r.position),
        })),
    };
};
