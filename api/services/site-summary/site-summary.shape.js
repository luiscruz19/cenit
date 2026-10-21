import crypto from 'node:crypto';

/**
 * Partes sin base de datos del resumen por sitio: el token y la forma de la respuesta. Separadas
 * para probarlas sin MySQL (tests/site-summary.test.js).
 */

export const TOKEN_PREFIX = 'cenit_';

export const newToken = () => TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const GA_ZERO = { sessions: 0, users: 0, newUsers: 0, pageViews: 0, engagementRate: 0, keyEvents: 0 };
const GSC_ZERO = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

const pickGa = (ga) => ga && {
    sessions: ga.sessions,
    users: ga.users,
    newUsers: ga.newUsers,
    pageViews: ga.pageViews,
    engagementRate: ga.engagementRate,
    keyEvents: ga.keyEvents,
};

const pickGsc = (gsc) => gsc && {
    clicks: gsc.clicks,
    impressions: gsc.impressions,
    ctr: gsc.ctr,
    position: gsc.position,
};

/**
 * Respuesta de GET /site-summary a partir de getSiteDetail(). Un bloque es null si esa fuente no
 * está conectada en el sitio (sin propiedad GA4 o sin Search Console); conectada y sin datos en
 * el período, va en ceros. Así el sitio distingue «falta conectar» de «todavía no hay datos».
 */
export const shapeSummary = ({ site, period, detail, updatedAt }) => {
    const hasGa = Boolean(site.ga4_property_id);
    const hasGsc = Boolean(site.gsc_site_url);
    const { kpis, range } = detail;
    return {
        site: { name: site.name, domain: site.domain },
        period,
        range: { from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo },
        updatedAt: updatedAt || null,
        ga: hasGa ? pickGa(kpis.ga) || { ...GA_ZERO } : null,
        gaPrev: hasGa ? pickGa(kpis.gaPrev) || { ...GA_ZERO } : null,
        gsc: hasGsc ? pickGsc(kpis.gsc) || { ...GSC_ZERO } : null,
        gscPrev: hasGsc ? pickGsc(kpis.gscPrev) || { ...GSC_ZERO } : null,
        topPages: hasGa ? (detail.gaPages || []).slice(0, 5).map((p) => ({ path: p.path, views: p.pageViews })) : [],
        topQueries: hasGsc
            ? (detail.gscQueries || []).slice(0, 5).map((q) => ({
                query: q.query, clicks: q.clicks, impressions: q.impressions, position: q.position,
            }))
            : [],
    };
};
