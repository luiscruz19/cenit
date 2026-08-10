import Site from '../../models/Site.js';
import { getAuthedClient } from '../google/oauth.service.js';
import { runPerfForSite } from './perf.etl.js';

/**
 * Corre PageSpeed para todos los sitios activos. Secuencial a propósito: la API es lenta
 * y tiene límite de tasa, así que no conviene dispararla en paralelo. Usa la API key si está
 * (PAGESPEED_API_KEY); si no, el access token de la cuenta de Google conectada.
 */
export const runPerf = async ({ siteId = null } = {}) => {
    const where = { is_active: true, ...(siteId ? { id: siteId } : {}) };
    const sites = await Site.findAll({ where });

    // Token de la cuenta de Google (fallback si no hay API key). No rompe si no hay cuenta.
    let token = null;
    try {
        const { client } = await getAuthedClient();
        const at = await client.getAccessToken();
        token = typeof at === 'string' ? at : at?.token || null;
    } catch {
        /* sin cuenta de Google: se usará la API key si está configurada */
    }

    const stats = { sitesOk: 0, sitesFailed: 0, rows: 0 };
    for (const site of sites) {
        try {
            const r = await runPerfForSite(site, { token });
            stats.rows += r.rows;
            if (r.rows > 0) stats.sitesOk++;
            else stats.sitesFailed++;
        } catch (error) {
            console.error(`[perf] sitio ${site.domain} falló:`, error.message);
            stats.sitesFailed++;
        }
    }
    console.info(`[perf] ${stats.sitesOk} sitios OK · ${stats.rows} filas · ${stats.sitesFailed} con problemas`);
    return stats;
};
