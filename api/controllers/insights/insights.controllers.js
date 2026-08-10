import messages from '../../config/messages.js';
import Site from '../../models/Site.js';
import { getPortfolioHealth, getSeoOpportunities, getMonthlyTrend } from '../../services/insights/insights.service.js';
import { getRankings, getRankingHistory } from '../../services/insights/rankings.service.js';
import { getSiteStrategies } from '../../services/insights/strategies.service.js';
import { getSiteClarity } from '../../services/insights/clarity-read.service.js';
import { getSitePerformance } from '../../services/insights/performance-read.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

/** GET /insights/health — salud/alertas de todo el portfolio. */
export const health = async (req, res) => {
    const data = await getPortfolioHealth();
    return res.json(successMessage({ extra: data }));
};

/** GET /insights/seo-opportunities?siteId= — página 2 + bajo CTR. */
export const seoOpportunities = async (req, res) => {
    const siteId = req.query.siteId ? Number(req.query.siteId) : null;
    const data = await getSeoOpportunities(siteId);
    return res.json(successMessage({ extra: data }));
};

/** GET /insights/rankings — posición por consulta, con delta vs período anterior. */
export const rankings = async (req, res) => {
    const data = await getRankings({
        siteId: req.query.siteId ? Number(req.query.siteId) : null,
        period: req.query.period,
        bucket: req.query.bucket || null,
        search: (req.query.search || '').trim(),
        limit: req.query.limit,
    });
    return res.json(successMessage({ extra: data }));
};

/** GET /insights/rankings/history — serie diaria de posición de una consulta. */
export const rankingHistory = async (req, res) => {
    const data = await getRankingHistory({
        siteId: Number(req.query.siteId),
        query: req.query.query,
        period: req.query.period,
    });
    return res.json(successMessage({ extra: data }));
};

/** GET /insights/strategies?siteId=&period= — recomendaciones de ESE sitio, con evidencia. */
export const strategies = async (req, res) => {
    try {
        const data = await getSiteStrategies(Number(req.query.siteId), req.query.period);
        return res.json(successMessage({ extra: data }));
    } catch (error) {
        if (error.code === 'SITE_NOT_FOUND') {
            return res.status(404).json(errorMessage({ message: messages.site.not_found }));
        }
        throw error;
    }
};

/** GET /insights/clarity?siteId=&period= — fricción y comportamiento (Microsoft Clarity). */
export const clarity = async (req, res) => {
    try {
        const data = await getSiteClarity(Number(req.query.siteId), req.query.period);
        return res.json(successMessage({ extra: data }));
    } catch (error) {
        if (error.code === 'SITE_NOT_FOUND') {
            return res.status(404).json(errorMessage({ message: messages.site.not_found }));
        }
        throw error;
    }
};

/** GET /insights/performance?siteId= — Core Web Vitals (mobile/desktop). */
export const performance = async (req, res) => {
    try {
        const data = await getSitePerformance(Number(req.query.siteId));
        return res.json(successMessage({ extra: data }));
    } catch (error) {
        if (error.code === 'SITE_NOT_FOUND') {
            return res.status(404).json(errorMessage({ message: messages.site.not_found }));
        }
        throw error;
    }
};

/** GET /insights/monthly/:id — serie mensual larga de un sitio. */
export const monthly = async (req, res) => {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json(errorMessage({ message: messages.site.not_found }));
    const trend = await getMonthlyTrend(site.id);
    return res.json(successMessage({ extra: { site: { id: site.id, name: site.name, domain: site.domain }, trend } }));
};
