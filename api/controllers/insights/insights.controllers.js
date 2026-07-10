import messages from '../../config/messages.js';
import Site from '../../models/Site.js';
import { getPortfolioHealth, getSeoOpportunities, getMonthlyTrend } from '../../services/insights/insights.service.js';
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

/** GET /insights/monthly/:id — serie mensual larga de un sitio. */
export const monthly = async (req, res) => {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json(errorMessage({ message: messages.site.not_found }));
    const trend = await getMonthlyTrend(site.id);
    return res.json(successMessage({ extra: { site: { id: site.id, name: site.name, domain: site.domain }, trend } }));
};
