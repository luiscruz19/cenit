import scheduleDailyEtl from './etl-daily.job.js';
import CONFIG from './../config/config.js';

// Permite apagar los jobs (p.ej. en tests) con ENABLE_JOBS=false.
const ENABLE_JOBS = process.env.ENABLE_JOBS !== 'false';

if (ENABLE_JOBS) {
    scheduleDailyEtl();
    console.info(`Jobs programados: etl-daily (${CONFIG.ETL.CRON} ${CONFIG.TZ})`);
}
