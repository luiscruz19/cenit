import messages from '../../config/messages.js';
import AlertRule from '../../models/AlertRule.js';
import Site from '../../models/Site.js';
import { getAlertSchema, ALERT_METRICS } from '../../services/alerts/catalog.js';
import { evaluateRules, getEvents } from '../../services/alerts/alerts.service.js';
import { isConfigured, verifyConnection } from '../../services/mail/mailer.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

const serialize = (rule, siteName) => ({
    id: rule.id,
    name: rule.name,
    siteId: rule.site_id,
    siteName: siteName || null,
    metric: rule.metric,
    metricLabel: ALERT_METRICS[rule.metric]?.label || rule.metric,
    operator: rule.operator,
    threshold: Number(rule.threshold),
    windowDays: rule.window_days,
    severity: rule.severity,
    cooldownHours: rule.cooldown_hours,
    notifyEmails: rule.notify_emails || '',
    isActive: rule.is_active,
});

/** GET /alerts/schema — métricas y operadores disponibles + estado del SMTP. */
export const schema = async (req, res) =>
    res.json(successMessage({
        extra: { ...getAlertSchema(), mailConfigured: isConfigured() },
    }));

/** GET /alerts/rules */
export const listRules = async (req, res) => {
    const [rules, sites] = await Promise.all([
        AlertRule.findAll({ order: [['id', 'DESC']] }),
        Site.findAll({ attributes: ['id', 'name'] }),
    ]);
    const nameById = new Map(sites.map((s) => [s.id, s.name]));
    return res.json(successMessage({
        extra: { rules: rules.map((r) => serialize(r, nameById.get(r.site_id))) },
    }));
};

/** POST /alerts/rules */
export const createRule = async (req, res) => {
    const rule = await AlertRule.create({
        name: req.body.name,
        site_id: req.body.siteId || null,
        metric: req.body.metric,
        operator: req.body.operator,
        threshold: req.body.threshold,
        window_days: req.body.windowDays || 7,
        severity: req.body.severity || 'warning',
        cooldown_hours: req.body.cooldownHours ?? 24,
        notify_emails: (req.body.notifyEmails || '').trim() || null,
    });
    return res.status(201).json(successMessage({ extra: { rule: serialize(rule) } }));
};

/** PUT /alerts/rules/:id */
export const updateRule = async (req, res) => {
    const rule = await AlertRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json(errorMessage({ message: messages.alerts.rule_not_found }));

    const b = req.body;
    const fields = {};
    if (b.name !== undefined) fields.name = b.name;
    if (b.siteId !== undefined) fields.site_id = b.siteId || null;
    if (b.metric !== undefined) fields.metric = b.metric;
    if (b.operator !== undefined) fields.operator = b.operator;
    if (b.threshold !== undefined) fields.threshold = b.threshold;
    if (b.windowDays !== undefined) fields.window_days = b.windowDays;
    if (b.severity !== undefined) fields.severity = b.severity;
    if (b.cooldownHours !== undefined) fields.cooldown_hours = b.cooldownHours;
    if (b.notifyEmails !== undefined) fields.notify_emails = (b.notifyEmails || '').trim() || null;
    if (b.isActive !== undefined) fields.is_active = Boolean(b.isActive);

    await rule.update(fields);
    return res.json(successMessage({ extra: { rule: serialize(rule) } }));
};

/** DELETE /alerts/rules/:id */
export const deleteRule = async (req, res) => {
    const rule = await AlertRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json(errorMessage({ message: messages.alerts.rule_not_found }));
    await rule.destroy();
    return res.json(successMessage({ extra: { deleted: true } }));
};

/** POST /alerts/run — evalúa ahora (todas las reglas, o una sola con ?ruleId). */
export const run = async (req, res) => {
    const summary = await evaluateRules({
        ruleId: req.body.ruleId ? Number(req.body.ruleId) : null,
    });
    return res.json(successMessage({ extra: { summary } }));
};

/** GET /alerts/events — historial de disparos. */
export const events = async (req, res) => {
    const data = await getEvents({
        limit: req.query.limit,
        siteId: req.query.siteId ? Number(req.query.siteId) : null,
    });
    return res.json(successMessage({ extra: { events: data } }));
};

/** POST /alerts/test-mail — verifica la conexión SMTP. */
export const testMail = async (req, res) => {
    const { ok, error } = await verifyConnection();
    if (!ok) return res.status(400).json(errorMessage({ message: `SMTP: ${error}` }));
    return res.json(successMessage({ message: 'La conexión SMTP funciona.' }));
};
