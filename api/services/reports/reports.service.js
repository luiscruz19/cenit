import CONFIG from '../../config/config.js';
import Report from '../../models/Report.js';
import ReportSend from '../../models/ReportSend.js';
import { buildReportData } from './report-data.service.js';
import { renderReportPdf } from './pdf.service.js';
import { sendMail, wrapHtml, isConfigured } from '../mail/mailer.service.js';

/**
 * Generación y envío de reportes. El PDF se arma en memoria y se adjunta al mail;
 * no se persiste en disco (el contenedor es efímero y el reporte se puede regenerar
 * siempre igual desde las tablas diarias).
 */

const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = String(d).split('-');
    return `${day}/${m}/${y}`;
};

const slug = (text) =>
    text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const generatePdf = async (report) => {
    const data = await buildReportData(report);
    const buffer = await renderReportPdf(data);
    const filename = `${slug(report.name)}-${data.range?.to || 'reporte'}.pdf`;
    return { buffer, filename, data };
};

const emailHtml = (report, data) => {
    const kpiRows = (data.kpis || []).map((k) => {
        const delta = k.delta === null || k.delta === undefined
            ? ''
            : `<span style="color:${k.delta > 0 ? '#2c6e49' : k.delta < 0 ? '#9e3a3a' : '#8b96a3'};font-weight:600;">
                 ${k.delta > 0 ? '+' : ''}${(k.delta * 100).toFixed(1).replace('.', ',')}%
               </span>`;
        const value = k.type === 'pct'
            ? `${((k.value || 0) * 100).toFixed(1).replace('.', ',')}%`
            : k.type === 'position'
                ? Number(k.value || 0).toFixed(1).replace('.', ',')
                : Math.round(k.value || 0).toLocaleString('es-AR');
        return `<tr>
            <td style="padding:6px 0;color:#5c6672;">${k.label}</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;">${value}</td>
            <td style="padding:6px 0 6px 12px;text-align:right;">${delta}</td>
        </tr>`;
    }).join('');

    const problems = (data.health || []).length
        ? `<p style="margin:16px 0 6px;font-weight:600;">Requiere atención</p>
           <ul style="margin:0;padding-left:18px;color:#5c6672;">
             ${data.health.slice(0, 5).map((h) => `<li>${h.name}: ${h.reasons[0] || ''}</li>`).join('')}
           </ul>`
        : '';

    return wrapHtml({
        title: report.name,
        intro: `${data.scope} · ${fmtDate(data.range?.from)} – ${fmtDate(data.range?.to)}`,
        bodyHtml: `
            <table style="width:100%;border-collapse:collapse;font-size:14px;">${kpiRows}</table>
            ${problems}
            <p style="margin:18px 0 0;color:#5c6672;">El reporte completo va adjunto en PDF.</p>
            <a href="${CONFIG.APP_URL}${data.siteId ? `/sites/${data.siteId}` : '/'}"
               style="display:inline-block;margin-top:12px;background:#0e6b75;color:#fff;text-decoration:none;padding:9px 14px;border-radius:6px;font-weight:600;font-size:14px;">
               Abrir en Cenit
            </a>`,
        footer: 'Reporte automático de Cenit.',
    });
};

/**
 * Genera el PDF y lo manda a los destinatarios del reporte. Registra el resultado en
 * report_sends pase lo que pase, así el historial nunca miente.
 */
export const sendReport = async (report, triggerType = 'scheduled') => {
    const recipients = (report.recipients || '').trim();

    if (!recipients) {
        await ReportSend.create({
            report_id: report.id, status: 'failed', trigger_type: triggerType,
            error: 'El reporte no tiene destinatarios',
        });
        return { sent: false, error: 'El reporte no tiene destinatarios' };
    }
    if (!isConfigured()) {
        await ReportSend.create({
            report_id: report.id, status: 'failed', trigger_type: triggerType,
            recipients, error: 'SMTP no configurado',
        });
        return { sent: false, error: 'SMTP no configurado' };
    }

    try {
        const { buffer, filename, data } = await generatePdf(report);
        const { sent, error } = await sendMail({
            to: recipients,
            subject: `${report.name} · ${fmtDate(data.range?.to)}`,
            html: emailHtml(report, data),
            attachments: [{ filename, content: buffer, contentType: 'application/pdf' }],
        });

        await ReportSend.create({
            report_id: report.id,
            status: sent ? 'sent' : 'failed',
            trigger_type: triggerType,
            recipients,
            error: error || null,
        });
        if (sent) await report.update({ last_sent_at: new Date() });

        return { sent, error };
    } catch (error) {
        await ReportSend.create({
            report_id: report.id, status: 'failed', trigger_type: triggerType,
            recipients, error: error.message.slice(0, 300),
        });
        return { sent: false, error: error.message };
    }
};

/** ¿Al reporte le toca salir en esta hora? */
const isDue = (report, now) => {
    if (report.schedule_frequency === 'none' || !report.is_active) return false;
    if (now.getHours() !== report.schedule_hour) return false;

    if (report.schedule_frequency === 'weekly' && now.getDay() !== report.schedule_day) return false;
    if (report.schedule_frequency === 'monthly' && now.getDate() !== report.schedule_day) return false;

    // Guarda contra doble envío si el job corriera dos veces dentro de la misma hora.
    if (report.last_sent_at) {
        const last = new Date(report.last_sent_at);
        const sameHour = last.getFullYear() === now.getFullYear()
            && last.getMonth() === now.getMonth()
            && last.getDate() === now.getDate()
            && last.getHours() === now.getHours();
        if (sameHour) return false;
    }
    return true;
};

/** Recorre los reportes programados y manda los que corresponden a esta hora. */
export const runScheduledReports = async () => {
    const reports = await Report.findAll({ where: { is_active: true } });
    // La hora local del contenedor es la del negocio (TZ va en el compose).
    const now = new Date();

    const summary = { due: 0, sent: 0, failed: 0 };
    for (const report of reports) {
        if (!isDue(report, now)) continue;
        summary.due++;
        const { sent } = await sendReport(report, 'scheduled');
        if (sent) summary.sent++;
        else summary.failed++;
    }
    return summary;
};

/** Historial de envíos. */
export const getSends = async (reportId = null, limit = 30) => {
    const sends = await ReportSend.findAll({
        where: { ...(reportId ? { report_id: reportId } : {}) },
        order: [['createdAt', 'DESC']],
        limit: Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100),
    });
    return sends.map((s) => ({
        id: s.id,
        reportId: s.report_id,
        status: s.status,
        triggerType: s.trigger_type,
        recipients: s.recipients,
        error: s.error,
        createdAt: s.createdAt,
    }));
};
