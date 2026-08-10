import cron from 'node-cron';
import CONFIG from '../config/config.js';
import { evaluateRules } from '../services/alerts/alerts.service.js';

/**
 * Evaluación diaria de las reglas de alerta. Corre DESPUÉS del ETL (por defecto 05:30,
 * media hora después de la carga): si corriera antes, evaluaría datos de ayer.
 *
 * Un fallo acá no puede tumbar el proceso: se loguea y se sigue.
 */
const scheduleAlerts = () => {
    cron.schedule(CONFIG.ALERTS.CRON, async () => {
        try {
            const summary = await evaluateRules();
            console.info(
                `[alerts] evaluadas ${summary.rulesEvaluated} reglas · ${summary.triggered} disparos · `
                + `${summary.notified} notificadas · ${summary.skippedCooldown} en cooldown`
            );
            for (const error of summary.errors) console.warn(`[alerts] ${error}`);
        } catch (error) {
            console.error('[alerts] la evaluación falló:', error.message);
        }
    }, { timezone: CONFIG.TZ });
};

export default scheduleAlerts;
