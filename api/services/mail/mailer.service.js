import nodemailer from 'nodemailer';
import CONFIG from '../../config/config.js';

/**
 * Envío de email por SMTP. Lo usan las alertas y los envíos programados de reportes.
 *
 * Si no hay SMTP configurado, `isConfigured()` da false y los llamadores registran el
 * evento igual, marcándolo como no notificado. La falta de credenciales nunca rompe el
 * ETL ni el job de alertas: degrada, no explota.
 */

const { MAIL } = CONFIG;

let transporter = null;

export const isConfigured = () => Boolean(MAIL.HOST && MAIL.USER && MAIL.PASS);

const getTransporter = () => {
    if (!isConfigured()) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: MAIL.HOST,
            port: MAIL.PORT,
            secure: MAIL.PORT === 465, // 465 = TLS implícito; 587 = STARTTLS.
            auth: { user: MAIL.USER, pass: MAIL.PASS },
        });
    }
    return transporter;
};

/**
 * Envía un mail. Devuelve { sent, error } en vez de tirar excepción, para que el
 * llamador pueda dejar constancia del fallo sin abortar todo el lote.
 */
export const sendMail = async ({ to, subject, html, text, attachments }) => {
    const recipients = (Array.isArray(to) ? to : String(to || '').split(','))
        .map((e) => e.trim())
        .filter(Boolean);

    if (recipients.length === 0) return { sent: false, error: 'Sin destinatarios' };

    const tx = getTransporter();
    if (!tx) return { sent: false, error: 'SMTP no configurado' };

    try {
        await tx.sendMail({
            from: MAIL.FROM,
            to: recipients.join(', '),
            subject,
            text: text || undefined,
            html: html || undefined,
            // Formato de nodemailer: [{ filename, content: Buffer, contentType }].
            attachments: attachments?.length ? attachments : undefined,
        });
        return { sent: true, error: null };
    } catch (error) {
        console.error('[mail] envío falló:', error.message);
        return { sent: false, error: error.message.slice(0, 300) };
    }
};

/** Verifica la conexión SMTP (para el botón de prueba en Configuración). */
export const verifyConnection = async () => {
    const tx = getTransporter();
    if (!tx) return { ok: false, error: 'SMTP no configurado' };
    try {
        await tx.verify();
        return { ok: true, error: null };
    } catch (error) {
        return { ok: false, error: error.message.slice(0, 300) };
    }
};

/** Envoltorio HTML común: mismo aspecto para alertas y reportes. */
export const wrapHtml = ({ title, intro, bodyHtml, footer }) => `
<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171b21;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dfe4e9;border-radius:8px;overflow:hidden;">
    <div style="padding:20px 24px;border-bottom:1px solid #eceff2;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0e6b75;font-weight:600;">Cenit</div>
      <h1 style="margin:6px 0 0;font-size:18px;line-height:1.3;">${title}</h1>
      ${intro ? `<p style="margin:8px 0 0;font-size:14px;color:#5c6672;">${intro}</p>` : ''}
    </div>
    <div style="padding:20px 24px;font-size:14px;line-height:1.6;">${bodyHtml}</div>
    <div style="padding:14px 24px;border-top:1px solid #eceff2;font-size:12px;color:#8b96a3;">
      ${footer || 'Enviado automáticamente por Cenit.'}
    </div>
  </div>
</body>
</html>`;
