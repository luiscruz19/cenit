import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import messages from '../../config/messages.js';
import Site from '../../models/Site.js';
import { getAuthedClient } from '../../services/google/oauth.service.js';
import { listProperties, getPropertyHost } from '../../services/google/ga4.service.js';
import { listSites as listGscSites, gscHost } from '../../services/google/gsc.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

const normalizeDomain = (value = '') =>
    value.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');

/** GET /sites — sitios + última fecha con datos por fuente. */
export const listSites = async (req, res) => {
    const [sites, gaLast, gscLast] = await Promise.all([
        Site.findAll({ order: [['name', 'ASC']] }),
        sequelize.query(
            'SELECT site_id, MAX(date) AS last FROM ga_daily_metrics GROUP BY site_id',
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            'SELECT site_id, MAX(date) AS last FROM gsc_daily_totals GROUP BY site_id',
            { type: QueryTypes.SELECT }
        ),
    ]);
    const gaMap = new Map(gaLast.map((r) => [r.site_id, String(r.last)]));
    const gscMap = new Map(gscLast.map((r) => [r.site_id, String(r.last)]));

    return res.json(successMessage({
        extra: {
            sites: sites.map((s) => ({
                ...s.toJSON(),
                last_ga_date: gaMap.get(s.id) || null,
                last_gsc_date: gscMap.get(s.id) || null,
            })),
        },
    }));
};

/** POST /sites */
export const createSite = async (req, res) => {
    const domain = normalizeDomain(req.body.domain);
    const existing = await Site.findOne({ where: { domain } });
    if (existing) {
        return res.status(409).json(errorMessage({ message: messages.site.domain_exists }));
    }
    const site = await Site.create({
        name: req.body.name,
        domain,
        ga4_property_id: req.body.ga4_property_id || null,
        gsc_site_url: req.body.gsc_site_url || null,
    });
    return res.status(201).json(successMessage({ extra: { site } }));
};

/** PUT /sites/:id */
export const updateSite = async (req, res) => {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json(errorMessage({ message: messages.site.not_found }));

    const fields = {};
    if (req.body.name !== undefined) fields.name = req.body.name;
    if (req.body.domain !== undefined) fields.domain = normalizeDomain(req.body.domain);
    if (req.body.ga4_property_id !== undefined) fields.ga4_property_id = req.body.ga4_property_id || null;
    if (req.body.gsc_site_url !== undefined) fields.gsc_site_url = req.body.gsc_site_url || null;
    if (req.body.is_active !== undefined) fields.is_active = Boolean(req.body.is_active);

    await site.update(fields);
    return res.json(successMessage({ extra: { site } }));
};

/** DELETE /sites/:id — si tiene métricas cargadas solo se desactiva. */
export const deleteSite = async (req, res) => {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json(errorMessage({ message: messages.site.not_found }));

    const [row] = await sequelize.query(
        'SELECT (SELECT COUNT(*) FROM ga_daily_metrics WHERE site_id = :id) + (SELECT COUNT(*) FROM gsc_daily_totals WHERE site_id = :id) AS total',
        { replacements: { id: site.id }, type: QueryTypes.SELECT }
    );
    if (Number(row.total) > 0) {
        await site.update({ is_active: false });
        return res.json(successMessage({ message: messages.site.has_data, extra: { site } }));
    }
    await site.destroy();
    return res.json(successMessage({ extra: { deleted: true } }));
};

/**
 * GET /sites/discovery — propiedades GA4 y sitios GSC reales de la cuenta +
 * sugerencias de mapeo por dominio (via defaultUri del web stream / siteUrl).
 */
export const discovery = async (req, res) => {
    try {
        const { client } = await getAuthedClient();

        const [properties, gscSites, sites] = await Promise.all([
            listProperties(client),
            listGscSites(client),
            Site.findAll({ where: { is_active: true } }),
        ]);

        // Host real de cada propiedad (1 llamada por propiedad, solo en discovery).
        const withHosts = await Promise.all(properties.map(async (p) => ({
            ...p,
            host: await getPropertyHost(client, p.propertyId),
        })));

        const gscWithHosts = gscSites.map((s) => ({ ...s, host: gscHost(s.siteUrl) }));

        const suggestions = sites.map((site) => {
            const byHost = withHosts.find((p) => p.host === site.domain);
            const byName = withHosts.find(
                (p) => p.displayName.toLowerCase().includes(site.domain.split('.')[0])
            );
            const gscMatch = gscWithHosts.find((s) => s.host === site.domain);
            return {
                siteId: site.id,
                domain: site.domain,
                ga4PropertyId: byHost?.propertyId || byName?.propertyId || null,
                gscSiteUrl: gscMatch?.siteUrl || null,
            };
        });

        return res.json(successMessage({
            extra: { ga4Properties: withHosts, gscSites: gscWithHosts, suggestions },
        }));
    } catch (error) {
        if (error.code === 'NO_GOOGLE_ACCOUNT') {
            return res.status(409).json(errorMessage({
                message: 'No hay una cuenta de Google vinculada. Iniciá sesión de nuevo.',
                code: 'no_google_account',
            }));
        }
        console.error('[sites] discovery falló:', error.message);
        return res.status(502).json(errorMessage({ message: 'No se pudieron consultar las APIs de Google.' }));
    }
};

/** POST /sites/mapping — aplica mapeos en bulk [{siteId, ga4PropertyId, gscSiteUrl}]. */
export const applyMapping = async (req, res) => {
    const { mappings } = req.body;
    let updated = 0;
    for (const m of mappings) {
        const site = await Site.findByPk(m.siteId);
        if (!site) continue;
        await site.update({
            ...(m.ga4PropertyId !== undefined ? { ga4_property_id: m.ga4PropertyId || null } : {}),
            ...(m.gscSiteUrl !== undefined ? { gsc_site_url: m.gscSiteUrl || null } : {}),
        });
        updated++;
    }
    return res.json(successMessage({ extra: { updated } }));
};
