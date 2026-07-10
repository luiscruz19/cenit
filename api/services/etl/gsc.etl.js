import { query } from '../google/gsc.service.js';
import GscDailyTotal from '../../models/GscDailyTotal.js';
import GscDailyQuery from '../../models/GscDailyQuery.js';
import GscDailyPage from '../../models/GscDailyPage.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Recorta filas [date, dim] a top N por fecha (por clicks, desempate por impresiones).
 */
const topNPerDate = (rows, topN) => {
    const byDate = new Map();
    for (const row of rows) {
        const date = row.keys[0];
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date).push(row);
    }
    return [...byDate.values()].flatMap((dateRows) =>
        dateRows
            .sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions))
            .slice(0, topN)
    );
};

/**
 * ETL Search Console de un sitio para [from, to]. 3 llamadas: totales por día,
 * queries y pages (top N por día). Upserts idempotentes como en GA4.
 */
export const runGscForSite = async (authClient, site, { from, to, topN }) => {
    const siteUrl = site.gsc_site_url;
    const singleDay = from === to;
    let rows = 0;

    // 1) Totales por día
    const totalsRows = await query(authClient, siteUrl, {
        from, to, dimensions: ['date'], rowLimit: 1000,
    });
    const totals = totalsRows.map((r) => ({
        site_id: site.id,
        date: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        position: round2(r.position),
    }));
    if (totals.length) {
        await GscDailyTotal.bulkCreate(totals, {
            updateOnDuplicate: ['clicks', 'impressions', 'position', 'updatedAt'],
        });
        rows += totals.length;
    }

    // 2 y 3) Top N de queries y pages por día.
    // En un día: se pide el top directo. En rangos: dims [date, X] con límite alto
    // y recorte a top N por fecha en código.
    for (const { dimension, Model, field, maxLen } of [
        { dimension: 'query', Model: GscDailyQuery, field: 'query', maxLen: 255 },
        { dimension: 'page', Model: GscDailyPage, field: 'page', maxLen: 500 },
    ]) {
        const dimRows = singleDay
            ? (await query(authClient, siteUrl, {
                from, to, dimensions: [dimension], rowLimit: topN,
            })).map((r) => ({ ...r, keys: [from, r.keys[0]] }))
            : topNPerDate(await query(authClient, siteUrl, {
                from, to, dimensions: ['date', dimension], rowLimit: 25000,
            }), topN);

        const records = dimRows.map((r) => ({
            site_id: site.id,
            date: r.keys[0],
            [field]: (r.keys[1] || '').slice(0, maxLen),
            clicks: r.clicks || 0,
            impressions: r.impressions || 0,
            position: round2(r.position),
        }));
        if (records.length) {
            await Model.bulkCreate(records, {
                updateOnDuplicate: ['clicks', 'impressions', 'position', 'updatedAt'],
            });
            rows += records.length;
        }
    }

    return { rows, apiCalls: 3 };
};
