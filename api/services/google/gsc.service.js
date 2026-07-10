import { google } from 'googleapis';
import { withRetry } from '../../utils/retry.js';

/**
 * Search Console API: sites.list + searchanalytics.query.
 * Los datos tienen ~2-3 días de retraso (GSC_LAG_DAYS) y ~16 meses de histórico.
 */

/** Lista los sitios verificados de la cuenta. */
export const listSites = async (authClient) => {
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    const { data } = await withRetry(() => searchconsole.sites.list());
    return (data.siteEntry || []).map((s) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
    }));
};

/**
 * Query de search analytics. rows: [{ keys: [...], clicks, impressions, ctr, position }]
 */
export const query = async (authClient, siteUrl, { from, to, dimensions, rowLimit = 1000 }) => {
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    const { data } = await withRetry(() =>
        searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate: from,
                endDate: to,
                dimensions,
                rowLimit,
                dataState: 'final',
            },
        })
    );
    return data.rows || [];
};

/** Dominio "pelado" de un siteUrl de GSC (sc-domain:x.com | https://x.com/). */
export const gscHost = (siteUrl) => {
    if (siteUrl.startsWith('sc-domain:')) return siteUrl.slice('sc-domain:'.length);
    try {
        return new URL(siteUrl).hostname.replace(/^www\./, '');
    } catch {
        return siteUrl;
    }
};
