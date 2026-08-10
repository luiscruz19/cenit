import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import Site from '../../models/Site.js';

/**
 * Lectura del rendimiento (Core Web Vitals) ya medido por el job de PageSpeed. Devuelve la
 * última foto de cada estrategia (mobile/desktop). No llama a PageSpeed: lee site_performance.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const num = (v) => (v === null || v === undefined ? null : Number(v));

export const getSitePerformance = async (siteId) => {
    const site = await Site.findByPk(siteId);
    if (!site) {
        const error = new Error('Sitio no encontrado');
        error.code = 'SITE_NOT_FOUND';
        throw error;
    }

    // Última medición por estrategia.
    const rows = await select(
        `SELECT p.* FROM site_performance p
         JOIN (SELECT strategy, MAX(date) AS d FROM site_performance
               WHERE site_id = :siteId GROUP BY strategy) last
           ON last.strategy = p.strategy AND last.d = p.date
         WHERE p.site_id = :siteId`,
        { siteId }
    );

    const byStrategy = {};
    for (const r of rows) {
        byStrategy[r.strategy] = {
            date: String(r.date),
            perfScore: num(r.perf_score),
            lcpMs: num(r.lcp_ms),
            inpMs: num(r.inp_ms),
            cls: num(r.cls),
            fcpMs: num(r.fcp_ms),
            ttfbMs: num(r.ttfb_ms),
            source: r.source,
            overall: r.overall,
        };
    }

    return {
        hasData: rows.length > 0,
        mobile: byStrategy.mobile || null,
        desktop: byStrategy.desktop || null,
    };
};
