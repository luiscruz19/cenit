import cron from 'node-cron';
import CONFIG from '../config/config.js';
import { runScheduledReports } from '../services/reports/reports.service.js';

/**
 * Corre CADA HORA en punto y manda los reportes cuya programación cae en esta hora.
 * Es a la inversa de un cron por reporte: una sola tarea revisa a quién le toca, así
 * cambiar la programación desde la UI tiene efecto inmediato sin reprogramar nada.
 */
const scheduleReports = () => {
    cron.schedule(CONFIG.REPORTS.CRON, async () => {
        try {
            const summary = await runScheduledReports();
            if (summary.due > 0) {
                console.info(
                    `[reports] ${summary.due} programados para esta hora · `
                    + `${summary.sent} enviados · ${summary.failed} fallidos`
                );
            }
        } catch (error) {
            console.error('[reports] el envío programado falló:', error.message);
        }
    }, { timezone: CONFIG.TZ });
};

export default scheduleReports;
