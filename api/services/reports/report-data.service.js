import Site from '../../models/Site.js';
import { getOverview, getSiteDetail } from '../metrics/metrics.service.js';
import { getPortfolioHealth, getSeoOpportunities } from '../insights/insights.service.js';
import { getRankings } from '../insights/rankings.service.js';
import { getSitePerformance } from '../insights/performance-read.service.js';

/**
 * Junta todo lo que va a entrar en el PDF. No calcula nada nuevo: reusa los mismos
 * agregados que alimentan el dashboard, así el reporte y la pantalla nunca se
 * contradicen. Cada bloque se pide solo si el reporte lo tiene activado.
 */

const pct = (current, previous) => {
    if (!previous || previous === 0 || current === null || current === undefined) return null;
    return (current - previous) / previous;
};

export const buildReportData = async (report) => {
    const sections = report.sections || {};
    const period = report.period || '28d';
    const site = report.site_id ? await Site.findByPk(report.site_id) : null;

    const data = {
        title: report.name,
        scope: site ? `${site.name} · ${site.domain}` : 'Portfolio completo',
        siteId: site?.id || null,
        period,
        range: null,
        kpis: [],
        health: [],
        opportunities: [],
        rankings: [],
        topPages: [],
    };

    if (site) {
        const detail = await getSiteDetail(site.id, period);
        data.range = detail.range;
        const { ga, gaPrev, gsc, gscPrev } = detail.kpis;

        if (sections.kpis !== false) {
            const convRate = ga?.sessions ? (ga.keyEvents || 0) / ga.sessions : null;
            const convRatePrev = gaPrev?.sessions ? (gaPrev.keyEvents || 0) / gaPrev.sessions : null;
            data.kpis = [
                { label: 'Sesiones', value: ga?.sessions ?? 0, delta: pct(ga?.sessions, gaPrev?.sessions), type: 'int' },
                { label: 'Usuarios', value: ga?.users ?? 0, delta: pct(ga?.users, gaPrev?.users), type: 'int' },
                { label: 'Conversiones', value: ga?.keyEvents ?? 0, delta: pct(ga?.keyEvents, gaPrev?.keyEvents), type: 'int' },
                { label: 'Tasa conv.', value: convRate ?? 0, delta: pct(convRate, convRatePrev), type: 'pct' },
                { label: 'Clicks', value: gsc?.clicks ?? 0, delta: pct(gsc?.clicks, gscPrev?.clicks), type: 'int' },
                { label: 'Posición', value: gsc?.position ?? 0, delta: pct(gscPrev?.position, gsc?.position), type: 'position' },
            ];
        }
        // Rendimiento (Core Web Vitals) — la foto de mobile.
        try {
            const perf = await getSitePerformance(site.id);
            if (perf.hasData && perf.mobile) data.performance = perf.mobile;
        } catch { /* sin datos de rendimiento: se omite la sección */ }
        // Conversión por canal.
        data.channelConversions = (detail.channels || [])
            .filter((c) => (c.keyEvents || 0) > 0)
            .sort((a, b) => (b.keyEvents || 0) - (a.keyEvents || 0))
            .slice(0, 8)
            .map((c) => ({
                channel: c.channel,
                sessions: c.sessions,
                keyEvents: c.keyEvents,
                rate: c.sessions ? (c.keyEvents || 0) / c.sessions : null,
            }));
        if (sections.topPages !== false) {
            data.topPages = (detail.gscPages || []).slice(0, 10).map((p) => ({
                label: p.page, clicks: p.clicks, impressions: p.impressions, position: p.position,
            }));
        }
        // Geografía y conversiones: la misma info que ve el cliente en pantalla.
        data.geography = (detail.countries || [])
            .filter((c) => c.country && c.country !== '(not set)')
            .slice(0, 8);
        data.conversions = (detail.events || []).slice(0, 8);
    } else {
        const overview = await getOverview(period);
        data.range = overview.range;

        if (sections.kpis !== false) {
            const sum = (pick) => (overview.sites || []).reduce((a, s) => a + (pick(s) || 0), 0);
            const sessions = sum((s) => s.ga?.sessions);
            const sessionsPrev = sum((s) => s.gaPrev?.sessions);
            const users = sum((s) => s.ga?.users);
            const usersPrev = sum((s) => s.gaPrev?.users);
            const clicks = sum((s) => s.gsc?.clicks);
            const clicksPrev = sum((s) => s.gscPrev?.clicks);
            const impressions = sum((s) => s.gsc?.impressions);
            const impressionsPrev = sum((s) => s.gscPrev?.impressions);

            data.kpis = [
                { label: 'Sesiones', value: sessions, delta: pct(sessions, sessionsPrev), type: 'int' },
                { label: 'Usuarios', value: users, delta: pct(users, usersPrev), type: 'int' },
                { label: 'Clicks', value: clicks, delta: pct(clicks, clicksPrev), type: 'int' },
                { label: 'Impresiones', value: impressions, delta: pct(impressions, impressionsPrev), type: 'int' },
            ];
        }
        if (sections.topPages !== false) {
            data.topPages = (overview.sites || [])
                .slice()
                .sort((a, b) => (b.ga?.sessions || 0) - (a.ga?.sessions || 0))
                .slice(0, 12)
                .map((s) => ({
                    label: s.name,
                    clicks: s.gsc?.clicks || 0,
                    impressions: s.gsc?.impressions || 0,
                    position: s.gsc?.position || null,
                    sessions: s.ga?.sessions || 0,
                }));
        }
    }

    if (sections.health !== false) {
        const health = await getPortfolioHealth();
        data.health = (health.items || [])
            .filter((i) => i.level !== 'ok' && (!site || i.id === site.id))
            .map((i) => ({ name: i.name, level: i.level, reasons: i.reasons.map((r) => r.label) }));
    }

    if (sections.opportunities !== false) {
        const seo = await getSeoOpportunities(site?.id || null);
        data.opportunities = [...(seo.page2 || []), ...(seo.lowCtr || [])]
            .sort((a, b) => b.estClicks - a.estClicks)
            .slice(0, 10)
            .map((o) => ({
                query: o.query, site: o.site, position: o.position,
                impressions: o.impressions, estClicks: o.estClicks,
            }));
        data.estClicksGain = seo.totals?.estClicksGain || 0;
    }

    if (sections.rankings !== false) {
        const r = await getRankings({ siteId: site?.id || null, period, limit: 10 });
        data.rankingSummary = r.summary;
        data.rankings = r.items.map((i) => ({
            query: i.query, site: i.site, position: i.position, delta: i.delta, clicks: i.clicks,
        }));
    }

    return data;
};
