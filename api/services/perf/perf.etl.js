import SitePerformance from '../../models/SitePerformance.js';
import { runPageSpeed } from './psi.service.js';
import { todayArt } from '../../utils/dates.js';

/**
 * Rendimiento de un sitio para mobile y desktop. Una foto por día por estrategia (upsert).
 * Un fallo en una estrategia no tumba la otra ni el resto del job.
 */
export const runPerfForSite = async (site, auth) => {
    const url = `https://${site.domain}/`;
    const date = todayArt();
    let rows = 0;

    for (const strategy of ['mobile', 'desktop']) {
        try {
            const m = await runPageSpeed(url, strategy, auth);
            await SitePerformance.upsert({
                site_id: site.id,
                date,
                strategy,
                perf_score: m.perfScore,
                lcp_ms: m.lcpMs,
                inp_ms: m.inpMs,
                cls: m.cls,
                fcp_ms: m.fcpMs,
                ttfb_ms: m.ttfbMs,
                source: m.source,
                overall: m.overall,
            });
            rows++;
        } catch (error) {
            console.error(`[perf] ${site.domain} (${strategy}) falló:`, error.message);
        }
    }
    return { rows };
};
