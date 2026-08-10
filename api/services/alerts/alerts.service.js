import { Op, QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import CONFIG from '../../config/config.js';
import Site from '../../models/Site.js';
import AlertRule from '../../models/AlertRule.js';
import AlertEvent from '../../models/AlertEvent.js';
import { todayArt, addDays } from '../../utils/dates.js';
import { ALERT_METRICS } from './catalog.js';
import { sendMail, wrapHtml, isConfigured } from '../mail/mailer.service.js';

/**
 * Motor de alertas configurables.
 *
 * Se apoya en las mismas tablas diarias que el resto del dashboard, así que evaluar
 * una regla es una sola consulta agregada: no toca las APIs de Google ni consume cuota.
 * Corre después del ETL diario (jobs/alerts.job.js), pero también se puede disparar a mano.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const num = (v) => (v === null || v === undefined ? null : Number(v));

/** Ventana actual y previa, ancladas al último día con datos completos. */
const windows = (days) => {
    const to = addDays(todayArt(), -CONFIG.ETL.GSC_LAG_DAYS);
    const from = addDays(to, -(days - 1));
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(days - 1));
    return { from, to, prevFrom, prevTo };
};

/** Formatea un valor según el tipo de la métrica, para el mensaje. */
const fmt = (value, type) => {
    if (value === null) return 's/d';
    switch (type) {
        case 'pct': return `${(value * 100).toFixed(1).replace('.', ',')}%`;
        case 'position': return value.toFixed(1).replace('.', ',');
        default: return Math.round(value).toLocaleString('es-AR');
    }
};

/**
 * Decide si la regla se dispara para un sitio, y devuelve el mensaje ya armado.
 * Devuelve null si no se dispara (o si no hay datos suficientes).
 */
const evaluate = (rule, metric, current, previous) => {
    const threshold = Number(rule.threshold);
    if (current === null) return null;

    const label = metric.label;

    if (rule.operator === 'gt' && current > threshold) {
        return `${label} es ${fmt(current, metric.type)}, por encima del umbral de ${fmt(threshold, metric.type)}.`;
    }
    if (rule.operator === 'lt' && current < threshold) {
        return `${label} es ${fmt(current, metric.type)}, por debajo del umbral de ${fmt(threshold, metric.type)}.`;
    }

    // Los operadores porcentuales necesitan una base previa distinta de cero.
    if ((rule.operator === 'drop_pct' || rule.operator === 'rise_pct')) {
        if (previous === null || previous === 0) return null;
        const changePct = ((current - previous) / Math.abs(previous)) * 100;

        if (rule.operator === 'drop_pct' && changePct <= -threshold) {
            return `${label} cayó ${Math.abs(changePct).toFixed(0)}% (de ${fmt(previous, metric.type)} a ${fmt(current, metric.type)}), más que el ${threshold}% configurado.`;
        }
        if (rule.operator === 'rise_pct' && changePct >= threshold) {
            return `${label} subió ${changePct.toFixed(0)}% (de ${fmt(previous, metric.type)} a ${fmt(current, metric.type)}), más que el ${threshold}% configurado.`;
        }
    }

    return null;
};

/** ¿La regla ya disparó para este sitio dentro de su ventana de cooldown? */
const inCooldown = async (rule, siteId) => {
    if (!rule.cooldown_hours) return false;
    const since = new Date(Date.now() - rule.cooldown_hours * 3600 * 1000);
    const recent = await AlertEvent.findOne({
        where: { rule_id: rule.id, site_id: siteId, createdAt: { [Op.gte]: since } },
        order: [['createdAt', 'DESC']],
    });
    return Boolean(recent);
};

const alertEmailHtml = (site, rule, message) => wrapHtml({
    title: `${site.name}: ${rule.name}`,
    intro: message,
    bodyHtml: `
        <p style="margin:0 0 12px;">
            <strong>Sitio:</strong> ${site.name} (${site.domain})<br>
            <strong>Severidad:</strong> ${rule.severity}<br>
            <strong>Ventana:</strong> últimos ${rule.window_days} días
        </p>
        <a href="${CONFIG.APP_URL}/sites/${site.id}"
           style="display:inline-block;background:#0e6b75;color:#fff;text-decoration:none;padding:9px 14px;border-radius:6px;font-weight:600;font-size:14px;">
           Ver el sitio en Cenit
        </a>`,
    footer: `Regla "${rule.name}" · No se repetirá durante ${rule.cooldown_hours} h.`,
});

/**
 * Evalúa todas las reglas activas contra todos los sitios que les corresponden.
 * Devuelve un resumen; los disparos quedan en alert_events.
 */
export const evaluateRules = async ({ ruleId = null } = {}) => {
    const [rules, sites] = await Promise.all([
        AlertRule.findAll({
            where: { is_active: true, ...(ruleId ? { id: ruleId } : {}) },
            order: [['id', 'ASC']],
        }),
        Site.findAll({ where: { is_active: true } }),
    ]);

    const siteById = new Map(sites.map((s) => [s.id, s]));
    const summary = { rulesEvaluated: 0, triggered: 0, notified: 0, skippedCooldown: 0, errors: [] };

    for (const rule of rules) {
        const metric = ALERT_METRICS[rule.metric];
        if (!metric) {
            summary.errors.push(`Regla ${rule.id}: métrica desconocida "${rule.metric}"`);
            continue;
        }
        summary.rulesEvaluated++;

        // site_id NULL = la regla corre sobre todos los sitios activos.
        const targets = rule.site_id
            ? [siteById.get(rule.site_id)].filter(Boolean)
            : sites;
        if (targets.length === 0) continue;

        const w = windows(rule.window_days);
        const ids = targets.map((s) => s.id);

        // Las condiciones son literales fijos del servidor; los valores van por replacements.
        const rows = await select(
            `SELECT site_id,
                    ${metric.agg('date BETWEEN :from AND :to')}         AS cur,
                    ${metric.agg('date BETWEEN :prevFrom AND :prevTo')} AS prev
             FROM ${metric.table}
             WHERE site_id IN (:ids) AND date BETWEEN :prevFrom AND :to
             GROUP BY site_id`,
            { ids, from: w.from, to: w.to, prevFrom: w.prevFrom, prevTo: w.prevTo }
        );
        const byId = new Map(rows.map((r) => [r.site_id, r]));

        for (const site of targets) {
            const row = byId.get(site.id);
            const current = num(row?.cur);
            const previous = num(row?.prev);

            const message = evaluate(rule, metric, current, previous);
            if (!message) continue;

            if (await inCooldown(rule, site.id)) {
                summary.skippedCooldown++;
                continue;
            }

            const event = await AlertEvent.create({
                rule_id: rule.id,
                site_id: site.id,
                severity: rule.severity,
                value: current,
                previous_value: previous,
                message,
            });
            summary.triggered++;

            if (rule.notify_emails && isConfigured()) {
                const { sent, error } = await sendMail({
                    to: rule.notify_emails,
                    subject: `[Cenit · ${rule.severity}] ${site.name}: ${rule.name}`,
                    html: alertEmailHtml(site, rule, message),
                    text: message,
                });
                await event.update({ notified: sent, notify_error: error });
                if (sent) summary.notified++;
            }
        }
    }

    return summary;
};

/** Historial de disparos, más reciente primero. */
export const getEvents = async ({ limit = 50, siteId = null } = {}) => {
    const events = await AlertEvent.findAll({
        where: { ...(siteId ? { site_id: siteId } : {}) },
        include: [
            { model: Site, as: 'site', attributes: ['id', 'name', 'domain'] },
            { model: AlertRule, as: 'rule', attributes: ['id', 'name', 'metric'], paranoid: false },
        ],
        order: [['createdAt', 'DESC']],
        limit: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200),
    });
    return events.map((e) => ({
        id: e.id,
        severity: e.severity,
        message: e.message,
        value: num(e.value),
        previousValue: num(e.previous_value),
        notified: e.notified,
        notifyError: e.notify_error,
        createdAt: e.createdAt,
        site: e.site ? { id: e.site.id, name: e.site.name, domain: e.site.domain } : null,
        rule: e.rule ? { id: e.rule.id, name: e.rule.name, metric: e.rule.metric } : null,
    }));
};
