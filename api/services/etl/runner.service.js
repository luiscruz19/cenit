import { Op } from 'sequelize';
import CONFIG from '../../config/config.js';
import Site from '../../models/Site.js';
import EtlRun from '../../models/EtlRun.js';
import { getAuthedClient, markRevoked, isInvalidGrant } from '../google/oauth.service.js';
import { runGa4ForSite } from './ga4.etl.js';
import { runGscForSite } from './gsc.etl.js';
import { runClarityForSite } from './clarity.etl.js';
import { todayArt, addDays } from '../../utils/dates.js';

const { ETL } = CONFIG;

/**
 * Snapshot del objeto stats para persistir en el campo JSON. Sequelize detecta cambios
 * en columnas JSON por referencia: si se pasa siempre el mismo objeto mutado in-place,
 * los UPDATE sucesivos no se persisten. Clonar fuerza una referencia nueva cada vez.
 */
const snapshot = (stats) => JSON.parse(JSON.stringify(stats));

/** Pool simple de concurrencia (sin librerías): corre worker() sobre items de a N. */
const runPool = async (items, concurrency, worker) => {
    const queue = [...items];
    const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length) {
            const item = queue.shift();
            await worker(item);
        }
    });
    await Promise.all(runners);
};

/** ¿Hay una corrida activa (running de menos de 1h)? Guard anti-solapamiento. */
export const hasActiveRun = async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const active = await EtlRun.findOne({
        where: { status: 'running', started_at: { [Op.gt]: oneHourAgo } },
    });
    return Boolean(active);
};

/**
 * Rango por defecto de la corrida diaria, por fuente:
 *  - GA4: ayer (datos casi en tiempo real).
 *  - GSC: ventana de 4 días que termina en hoy−GSC_LAG_DAYS (los datos llegan con
 *    retraso y Google los ajusta retroactivamente; el upsert idempotente lo absorbe).
 */
const defaultRanges = () => {
    const today = todayArt();
    const gscTo = addDays(today, -ETL.GSC_LAG_DAYS);
    return {
        ga4: { from: addDays(today, -1), to: addDays(today, -1) },
        gsc: { from: addDays(gscTo, -3), to: gscTo },
    };
};

/**
 * Ejecuta una corrida de ETL. Crea la EtlRun y procesa los sitios con pool de
 * concurrencia. El error de un sitio no aborta la corrida (cierra 'partial');
 * invalid_grant sí la aborta (la cuenta quedó revocada).
 * Devuelve la EtlRun creada; si `background` es true no espera el resultado.
 */
export const runEtl = async ({
    triggerType = 'manual',
    source = 'all',
    siteId = null,
    from = null,
    to = null,
    background = true,
} = {}) => {
    const ranges = defaultRanges();
    if (from && to) {
        ranges.ga4 = { from, to };
        ranges.gsc = { from, to };
    }

    const run = await EtlRun.create({
        trigger_type: triggerType,
        source,
        site_id: siteId,
        date_from: from || ranges.gsc.from,
        date_to: to || ranges.ga4.to,
    });

    const execution = executeRun(run, { source, siteId, ranges });
    if (!background) await execution;
    return run;
};

const executeRun = async (run, { source, siteId, ranges }) => {
    const stats = { sitesOk: 0, sitesFailed: [], rowsUpserted: 0, apiCalls: 0 };
    try {
        const { client, account } = await getAuthedClient();

        const where = { is_active: true, ...(siteId ? { id: siteId } : {}) };
        const sites = await Site.findAll({ where });
        const doGa4 = source === 'all' || source === 'ga4';
        const doGsc = source === 'all' || source === 'gsc';
        const doClarity = source === 'all' || source === 'clarity';

        let revokedError = null;

        await runPool(sites, ETL.CONCURRENCY, async (site) => {
            if (revokedError) return;
            try {
                let touched = false;
                if (doGa4 && site.ga4_property_id) {
                    const r = await runGa4ForSite(client, site, { ...ranges.ga4, topN: ETL.TOP_N });
                    stats.rowsUpserted += r.rows;
                    stats.apiCalls += r.apiCalls;
                    touched = true;
                }
                if (doGsc && site.gsc_site_url) {
                    const r = await runGscForSite(client, site, { ...ranges.gsc, topN: ETL.TOP_N });
                    stats.rowsUpserted += r.rows;
                    stats.apiCalls += r.apiCalls;
                    touched = true;
                }
                // Clarity es independiente de Google (token propio, ventana de 24h): un
                // fallo suyo no debe tumbar el sitio ni el run, así que va en su propio try.
                if (doClarity && site.clarity_api_token_enc) {
                    try {
                        const r = await runClarityForSite(site);
                        stats.rowsUpserted += r.rows;
                        stats.apiCalls += r.apiCalls;
                        touched = true;
                    } catch (clarityError) {
                        console.error(`[etl] clarity ${site.domain} falló:`, clarityError.message);
                        stats.sitesFailed.push({ site: `${site.domain} (clarity)`, error: String(clarityError.message).slice(0, 300) });
                    }
                }
                if (touched) stats.sitesOk++;
            } catch (error) {
                if (isInvalidGrant(error)) {
                    revokedError = error;
                    await markRevoked(account, error.message);
                    return;
                }
                console.error(`[etl] sitio ${site.domain} falló:`, error.message);
                stats.sitesFailed.push({ site: site.domain, error: String(error.message).slice(0, 300) });
            }
        });

        if (revokedError) throw revokedError;

        const status = stats.sitesFailed.length === 0 ? 'success' : 'partial';
        await run.update({ status, stats: snapshot(stats), finished_at: new Date() });
        console.info(`[etl] run #${run.id} ${status}: ${stats.sitesOk} sitios, ${stats.rowsUpserted} filas`);
    } catch (error) {
        console.error(`[etl] run #${run.id} error:`, error.message);
        await run.update({
            status: 'error',
            stats: snapshot(stats),
            error: String(error.message).slice(0, 2000),
            finished_at: new Date(),
        });
    }
};

/**
 * Backfill histórico en chunks de 30 días, del más reciente al más antiguo
 * (valor inmediato en el dashboard). GSC solo tiene ~16 meses de histórico.
 */
export const runBackfill = async ({ months = ETL.BACKFILL_MONTHS } = {}) => {
    const today = todayArt();
    const gscTo = addDays(today, -ETL.GSC_LAG_DAYS);
    const oldest = addDays(today, -Math.round(months * 30.44));

    // Chunks [from, to] de 30 días hacia atrás.
    const chunks = [];
    for (let to = gscTo; to >= oldest;) {
        const from = addDays(to, -29) < oldest ? oldest : addDays(to, -29);
        chunks.push({ from, to });
        to = addDays(from, -1);
    }

    const run = await EtlRun.create({
        trigger_type: 'backfill',
        source: 'all',
        date_from: oldest,
        date_to: gscTo,
        stats: { chunksDone: 0, chunksTotal: chunks.length, rowsUpserted: 0 },
    });

    (async () => {
        const stats = { chunksDone: 0, chunksTotal: chunks.length, sitesFailed: [], rowsUpserted: 0, apiCalls: 0 };
        try {
            const { client, account } = await getAuthedClient();
            const sites = await Site.findAll({ where: { is_active: true } });

            for (const chunk of chunks) {
                await runPool(sites, ETL.CONCURRENCY, async (site) => {
                    try {
                        if (site.ga4_property_id) {
                            const r = await runGa4ForSite(client, site, { ...chunk, topN: ETL.TOP_N });
                            stats.rowsUpserted += r.rows;
                            stats.apiCalls += r.apiCalls;
                        }
                        if (site.gsc_site_url) {
                            const r = await runGscForSite(client, site, { ...chunk, topN: ETL.TOP_N });
                            stats.rowsUpserted += r.rows;
                            stats.apiCalls += r.apiCalls;
                        }
                    } catch (error) {
                        if (isInvalidGrant(error)) {
                            await markRevoked(account, error.message);
                            throw error;
                        }
                        stats.sitesFailed.push({
                            site: site.domain,
                            chunk: `${chunk.from}..${chunk.to}`,
                            error: String(error.message).slice(0, 300),
                        });
                    }
                });
                stats.chunksDone++;
                await run.update({ stats: snapshot(stats) });
                // Pausa corta entre chunks: cortesía de cuota (holgada igual).
                await new Promise((r) => setTimeout(r, 1000));
            }

            const status = stats.sitesFailed.length === 0 ? 'success' : 'partial';
            await run.update({ status, stats: snapshot(stats), finished_at: new Date() });
            console.info(`[etl] backfill #${run.id} ${status}: ${stats.rowsUpserted} filas`);
        } catch (error) {
            await run.update({
                status: 'error',
                stats: snapshot(stats),
                error: String(error.message).slice(0, 2000),
                finished_at: new Date(),
            });
        }
    })();

    return run;
};
