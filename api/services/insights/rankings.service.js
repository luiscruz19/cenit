import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import { resolveRange } from '../metrics/metrics.service.js';

/**
 * Rankings: posición por consulta a lo largo del tiempo, derivada de gsc_daily_queries.
 *
 * A diferencia de un rank tracker clásico (que muestrea la SERP cada semana), acá la
 * posición viene de Search Console con granularidad DIARIA y todo el histórico que haya
 * traído el backfill. La contracara: son posiciones promedio ponderadas por impresiones
 * tal como las reporta Google, solo de Google (no Bing) y sin SERP features.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const num = (v) => (v === null || v === undefined ? null : Number(v));

/** Buckets de posición. `rest` es todo lo que cae más allá de la página 2. */
const BUCKET_SQL = {
    top3: 'position <= 3',
    top10: 'position <= 10',
    page2: 'position > 10 AND position <= 20',
    rest: 'position > 20',
};

/**
 * Agregado por consulta: ventana actual + ventana previa de igual longitud, más la
 * mejor y la peor posición alcanzadas dentro de la ventana actual.
 */
const aggregateSql = ({ siteFilter, searchFilter }) => `
    SELECT q.site_id                                                    AS siteId,
           s.name                                                       AS site,
           s.domain                                                     AS domain,
           q.query                                                      AS query,
           SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.clicks END)      AS clicks,
           SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.impressions END) AS impressions,
           SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.position * q.impressions END)
               / NULLIF(SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.impressions END), 0) AS position,
           SUM(CASE WHEN q.date BETWEEN :prevFrom AND :prevTo THEN q.clicks END)      AS prevClicks,
           SUM(CASE WHEN q.date BETWEEN :prevFrom AND :prevTo THEN q.impressions END) AS prevImpressions,
           SUM(CASE WHEN q.date BETWEEN :prevFrom AND :prevTo THEN q.position * q.impressions END)
               / NULLIF(SUM(CASE WHEN q.date BETWEEN :prevFrom AND :prevTo THEN q.impressions END), 0) AS prevPosition,
           MIN(CASE WHEN q.date BETWEEN :from AND :to THEN q.position END) AS best,
           MAX(CASE WHEN q.date BETWEEN :from AND :to THEN q.position END) AS worst
    FROM gsc_daily_queries q
    JOIN sites s ON s.id = q.site_id
    WHERE q.date BETWEEN :prevFrom AND :to ${siteFilter} ${searchFilter}
    GROUP BY q.site_id, s.name, s.domain, q.query
    HAVING impressions > 0`;

/**
 * GET /insights/rankings — tabla de consultas con posición, delta y rango.
 * `bucket` filtra por tramo de posición; `search` busca dentro de la consulta.
 */
export const getRankings = async ({
    siteId = null, period = '28d', bucket = null, search = '', limit = 100,
} = {}) => {
    const r = resolveRange(period);

    const siteFilter = siteId ? 'AND q.site_id = :siteId' : '';
    const searchFilter = search ? 'AND q.query LIKE :search' : '';
    const params = {
        from: r.from, to: r.to, prevFrom: r.prevFrom, prevTo: r.prevTo,
        ...(siteId ? { siteId } : {}),
        ...(search ? { search: `%${search}%` } : {}),
    };

    const inner = aggregateSql({ siteFilter, searchFilter });
    const bucketFilter = BUCKET_SQL[bucket] ? `WHERE ${BUCKET_SQL[bucket]}` : '';

    // El límite se interpola como entero saneado: MySQL no acepta un placeholder en LIMIT.
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

    const [rows, summaryRows] = await Promise.all([
        select(
            `SELECT * FROM (${inner}) t ${bucketFilter}
             ORDER BY clicks DESC, impressions DESC
             LIMIT ${safeLimit}`,
            params
        ),
        select(
            `SELECT COUNT(*)                                                     AS total,
                    SUM(CASE WHEN ${BUCKET_SQL.top3}  THEN 1 ELSE 0 END)         AS top3,
                    SUM(CASE WHEN ${BUCKET_SQL.top10} THEN 1 ELSE 0 END)         AS top10,
                    SUM(CASE WHEN ${BUCKET_SQL.page2} THEN 1 ELSE 0 END)         AS page2,
                    SUM(CASE WHEN ${BUCKET_SQL.rest}  THEN 1 ELSE 0 END)         AS rest,
                    SUM(clicks)                                                  AS clicks,
                    SUM(impressions)                                             AS impressions,
                    SUM(position * impressions) / NULLIF(SUM(impressions), 0)    AS avgPosition,
                    SUM(CASE WHEN prevPosition IS NOT NULL AND position < prevPosition - 0.5 THEN 1 ELSE 0 END) AS improved,
                    SUM(CASE WHEN prevPosition IS NOT NULL AND position > prevPosition + 0.5 THEN 1 ELSE 0 END) AS worsened
             FROM (${inner}) t`,
            params
        ),
    ]);

    const s = summaryRows[0] || {};
    const round = (v, d = 1) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

    return {
        range: { from: r.from, to: r.to, prevFrom: r.prevFrom, prevTo: r.prevTo, days: r.days },
        summary: {
            total: num(s.total) || 0,
            top3: num(s.top3) || 0,
            top10: num(s.top10) || 0,
            page2: num(s.page2) || 0,
            rest: num(s.rest) || 0,
            clicks: num(s.clicks) || 0,
            impressions: num(s.impressions) || 0,
            avgPosition: round(num(s.avgPosition)),
            improved: num(s.improved) || 0,
            worsened: num(s.worsened) || 0,
        },
        items: rows.map((q) => {
            const clicks = num(q.clicks) || 0;
            const impressions = num(q.impressions) || 0;
            const position = num(q.position);
            const prevPosition = num(q.prevPosition);
            return {
                siteId: q.siteId,
                site: q.site,
                domain: q.domain,
                query: q.query,
                clicks,
                impressions,
                ctr: impressions ? clicks / impressions : 0,
                position: round(position),
                prevPosition: round(prevPosition),
                // Positivo = mejoró (subió puestos), porque en posición bajar es mejor.
                delta: position !== null && prevPosition !== null
                    ? round(prevPosition - position)
                    : null,
                best: round(num(q.best)),
                worst: round(num(q.worst)),
                prevClicks: num(q.prevClicks) || 0,
            };
        }),
    };
};

/**
 * GET /insights/rankings/history — serie diaria de posición de UNA consulta.
 * Es lo que un rank tracker convencional no puede dar: el día a día real.
 */
export const getRankingHistory = async ({ siteId, query, period = '90d' }) => {
    const r = resolveRange(period);
    const rows = await select(
        `SELECT date, position, clicks, impressions
         FROM gsc_daily_queries
         WHERE site_id = :siteId AND query = :query AND date BETWEEN :from AND :to
         ORDER BY date ASC`,
        { siteId, query, from: r.from, to: r.to }
    );
    return {
        range: { from: r.from, to: r.to },
        query,
        series: rows.map((row) => ({
            date: String(row.date),
            position: num(row.position),
            clicks: num(row.clicks) || 0,
            impressions: num(row.impressions) || 0,
        })),
    };
};
