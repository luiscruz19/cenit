import messages from '../../config/messages.js';
import Site from '../../models/Site.js';
import { getOverview, getSiteDetail } from '../../services/metrics/metrics.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

/** GET /metrics/overview?period=7d|28d|90d */
export const overview = async (req, res) => {
    const data = await getOverview(req.query.period);
    return res.json(successMessage({ extra: data }));
};

/** GET /metrics/sites/:id?period= */
export const siteDetail = async (req, res) => {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json(errorMessage({ message: messages.site.not_found }));

    const data = await getSiteDetail(site.id, req.query.period);
    return res.json(successMessage({
        extra: {
            site: {
                id: site.id,
                name: site.name,
                domain: site.domain,
                mapped: { ga4: Boolean(site.ga4_property_id), gsc: Boolean(site.gsc_site_url) },
            },
            ...data,
        },
    }));
};
