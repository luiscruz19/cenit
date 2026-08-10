import cron from 'node-cron';
import CONFIG from '../config/config.js';
import { runPerf } from '../services/perf/perf-runner.service.js';

/**
 * PageSpeed diario. Corre a una hora propia (por defecto 06:15), separado del ETL, porque
 * la API es lenta (decenas de segundos por sitio × mobile/desktop). Un fallo se loguea y no
 * afecta al resto.
 */
const schedulePerf = () => {
    cron.schedule(CONFIG.PERF.CRON, async () => {
        try {
            await runPerf();
        } catch (error) {
            console.error('[cron][perf] falló:', error.message);
        }
    }, { timezone: CONFIG.TZ });
};

export default schedulePerf;
