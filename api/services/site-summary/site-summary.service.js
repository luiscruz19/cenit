import { QueryTypes } from 'sequelize';
import { sequelize } from '../../models/index.js';
import { getSiteDetail } from '../metrics/metrics.service.js';
import { shapeSummary } from './site-summary.shape.js';

/** Último día con datos del sitio, de GA4 o de Search Console (YYYY-MM-DD), o null. */
const lastDataDate = async (siteId) => {
    const [row] = await sequelize.query(
        `SELECT GREATEST(
                    COALESCE((SELECT MAX(date) FROM ga_daily_metrics WHERE site_id = :siteId), '1970-01-01'),
                    COALESCE((SELECT MAX(date) FROM gsc_daily_totals WHERE site_id = :siteId), '1970-01-01')
                ) AS last_date`,
        { replacements: { siteId }, type: QueryTypes.SELECT }
    );
    const last = row && String(row.last_date).slice(0, 10);
    return last && last !== '1970-01-01' ? last : null;
};

/** Resumen de un sitio para su propio escritorio: KPIs del período y del anterior, top 5. */
export const getSiteSummary = async (site, period = '28d') => {
    const [detail, updatedAt] = await Promise.all([getSiteDetail(site.id, period), lastDataDate(site.id)]);
    return shapeSummary({ site, period, detail, updatedAt });
};
