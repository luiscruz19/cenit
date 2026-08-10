import messages from '../../config/messages.js';
import Site from '../../models/Site.js';
import { getOverview, getSiteDetail } from '../../services/metrics/metrics.service.js';
import { getSchema, runExplore } from '../../services/metrics/explore.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

/** Acepta "a,b,c" o ?x=a&x=b y devuelve siempre un array de strings. */
const toList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    return String(value).split(',').map((v) => v.trim()).filter(Boolean);
};

/** GET /metrics/overview?period=7d|28d|90d */
export const overview = async (req, res) => {
    const data = await getOverview(req.query.period);
    return res.json(successMessage({ extra: data }));
};

/** GET /metrics/explore/schema — catálogo de datasets, dimensiones y métricas. */
export const exploreSchema = async (req, res) =>
    res.json(successMessage({ extra: { datasets: getSchema() } }));

/** GET /metrics/explore — tabla dinámica sobre un dataset. */
export const explore = async (req, res) => {
    try {
        const data = await runExplore({
            dataset: req.query.dataset,
            dimensions: toList(req.query.dimensions),
            metrics: toList(req.query.metrics),
            period: req.query.period,
            siteId: req.query.siteId ? Number(req.query.siteId) : null,
            search: (req.query.search || '').trim(),
            sort: req.query.sort || null,
            desc: req.query.desc !== 'false',
            limit: req.query.limit,
        });
        return res.json(successMessage({ extra: data }));
    } catch (error) {
        if (error.code === 'BAD_DATASET' || error.code === 'NO_METRICS') {
            return res.status(400).json(errorMessage({ message: error.message }));
        }
        throw error;
    }
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
