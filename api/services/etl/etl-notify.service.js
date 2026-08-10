import CONFIG from '../../config/config.js';
import EtlRun from '../../models/EtlRun.js';
import GoogleAccount from '../../models/GoogleAccount.js';
import { sendMail, wrapHtml, isConfigured } from '../mail/mailer.service.js';

/**
 * Aviso proactivo del estado del ETL. Se llama después de la corrida diaria: si algo salió
 * mal —la corrida falló, quedó parcial con sitios caídos, o Google revocó el acceso— manda
 * un email al equipo en vez de que el problema se descubra de casualidad días después.
 *
 * Una corrida OK no genera ruido: solo se avisa cuando hay algo que mirar.
 */

/** A quién avisar: OPS_EMAILS si está, si no el equipo del allowlist. */
const recipients = () => {
    const ops = (process.env.OPS_EMAILS || '')
        .split(',').map((e) => e.trim()).filter(Boolean);
    return ops.length ? ops : CONFIG.ALLOWED_EMAILS;
};

export const notifyEtlResult = async (runId) => {
    // Se relee el run ya finalizado (executeRun corre asíncrono y actualiza status al terminar).
    const run = await EtlRun.findByPk(runId);
    if (!run) return { notified: false, reason: 'run no encontrado' };

    const account = await GoogleAccount.findOne({ order: [['id', 'ASC']] });
    const revoked = account?.status === 'revoked';
    const failed = run.stats?.sitesFailed || [];

    // Nada que avisar si todo salió bien.
    if (run.status === 'success' && !revoked) {
        return { notified: false, reason: 'sin problemas' };
    }

    const to = recipients();
    if (!to.length || !isConfigured()) {
        return { notified: false, reason: 'sin destinatarios o SMTP no configurado' };
    }

    const severity = revoked || run.status === 'error' ? 'crítico' : 'parcial';

    const problems = [];
    if (revoked) {
        problems.push('<strong>Google revocó o venció el acceso.</strong> El ETL no puede traer datos hasta reconectar la cuenta en Configuración.');
    }
    if (run.status === 'error') {
        problems.push(`La corrida falló entera: ${run.error ? String(run.error).slice(0, 200) : 'error desconocido'}.`);
    }
    if (failed.length) {
        const list = failed.slice(0, 10).map((f) => `${f.site}: ${f.error}`).join('<br>');
        problems.push(`${failed.length} ${failed.length === 1 ? 'sitio falló' : 'sitios fallaron'}:<br>${list}`);
    }

    const html = wrapHtml({
        title: `ETL con problemas (${severity})`,
        intro: `Corrida #${run.id} · ${run.trigger_type} · ${new Date(run.createdAt).toLocaleString('es-AR')}`,
        bodyHtml: `
            ${problems.map((p) => `<p style="margin:0 0 12px;">${p}</p>`).join('')}
            <a href="${CONFIG.APP_URL}/settings"
               style="display:inline-block;margin-top:8px;background:#0e6b75;color:#fff;text-decoration:none;padding:9px 14px;border-radius:6px;font-weight:600;font-size:14px;">
               Abrir Configuración
            </a>`,
        footer: 'Aviso automático del ETL de Cenit. Solo se envía cuando hay algo que revisar.',
    });

    const { sent, error } = await sendMail({
        to,
        subject: `[Cenit · ${severity}] El ETL necesita atención (corrida #${run.id})`,
        html,
        text: problems.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n'),
    });

    return { notified: sent, error };
};
