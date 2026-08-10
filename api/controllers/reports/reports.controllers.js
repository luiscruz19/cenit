import messages from '../../config/messages.js';
import Report from '../../models/Report.js';
import Site from '../../models/Site.js';
import { generatePdf, sendReport, getSends } from '../../services/reports/reports.service.js';
import { isConfigured } from '../../services/mail/mailer.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

const serialize = (report, siteName) => ({
    id: report.id,
    name: report.name,
    siteId: report.site_id,
    siteName: siteName || null,
    period: report.period,
    sections: report.sections,
    scheduleFrequency: report.schedule_frequency,
    scheduleDay: report.schedule_day,
    scheduleHour: report.schedule_hour,
    recipients: report.recipients || '',
    isActive: report.is_active,
    lastSentAt: report.last_sent_at,
});

/** GET /reports */
export const listReports = async (req, res) => {
    const [reports, sites] = await Promise.all([
        Report.findAll({ order: [['id', 'DESC']] }),
        Site.findAll({ attributes: ['id', 'name'] }),
    ]);
    const nameById = new Map(sites.map((s) => [s.id, s.name]));
    return res.json(successMessage({
        extra: {
            reports: reports.map((r) => serialize(r, nameById.get(r.site_id))),
            mailConfigured: isConfigured(),
        },
    }));
};

/** POST /reports */
export const createReport = async (req, res) => {
    const report = await Report.create({
        name: req.body.name,
        site_id: req.body.siteId || null,
        period: req.body.period || '28d',
        sections: req.body.sections || undefined,
        schedule_frequency: req.body.scheduleFrequency || 'none',
        schedule_day: req.body.scheduleDay ?? 1,
        schedule_hour: req.body.scheduleHour ?? 8,
        recipients: (req.body.recipients || '').trim() || null,
    });
    return res.status(201).json(successMessage({ extra: { report: serialize(report) } }));
};

/** PUT /reports/:id */
export const updateReport = async (req, res) => {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json(errorMessage({ message: messages.reports.not_found }));

    const b = req.body;
    const fields = {};
    if (b.name !== undefined) fields.name = b.name;
    if (b.siteId !== undefined) fields.site_id = b.siteId || null;
    if (b.period !== undefined) fields.period = b.period;
    if (b.sections !== undefined) fields.sections = b.sections;
    if (b.scheduleFrequency !== undefined) fields.schedule_frequency = b.scheduleFrequency;
    if (b.scheduleDay !== undefined) fields.schedule_day = b.scheduleDay;
    if (b.scheduleHour !== undefined) fields.schedule_hour = b.scheduleHour;
    if (b.recipients !== undefined) fields.recipients = (b.recipients || '').trim() || null;
    if (b.isActive !== undefined) fields.is_active = Boolean(b.isActive);

    await report.update(fields);
    return res.json(successMessage({ extra: { report: serialize(report) } }));
};

/** DELETE /reports/:id */
export const deleteReport = async (req, res) => {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json(errorMessage({ message: messages.reports.not_found }));
    await report.destroy();
    return res.json(successMessage({ extra: { deleted: true } }));
};

/** GET /reports/:id/pdf — descarga el PDF al instante (sin pasar por email). */
export const downloadPdf = async (req, res) => {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json(errorMessage({ message: messages.reports.not_found }));

    const { buffer, filename } = await generatePdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
};

/**
 * GET /reports/site/:id/pdf?period= — PDF de un sitio al vuelo, sin tener que crear
 * un reporte guardado. Se arma un reporte "de paso" con todas las secciones activas.
 */
export const siteAdHocPdf = async (req, res) => {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json(errorMessage({ message: messages.site.not_found }));

    const transient = {
        id: 0,
        name: site.name,
        site_id: site.id,
        period: req.query.period || '28d',
        sections: { kpis: true, health: true, opportunities: true, rankings: true, topPages: true },
    };

    const { buffer, filename } = await generatePdf(transient);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
};

/** POST /reports/:id/send — envía ahora, sin esperar a la programación. */
export const sendNow = async (req, res) => {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json(errorMessage({ message: messages.reports.not_found }));

    const { sent, error } = await sendReport(report, 'manual');
    if (!sent) return res.status(400).json(errorMessage({ message: error || 'No se pudo enviar' }));
    return res.json(successMessage({ message: 'Reporte enviado.' }));
};

/** GET /reports/sends — historial de envíos. */
export const sends = async (req, res) => {
    const data = await getSends(
        req.query.reportId ? Number(req.query.reportId) : null,
        req.query.limit
    );
    return res.json(successMessage({ extra: { sends: data } }));
};
